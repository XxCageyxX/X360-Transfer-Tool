import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import path from 'path';
import fs from 'fs';
import axios from 'axios';
import * as ftp from 'basic-ftp';
import { fileURLToPath } from 'url';
import { Worker } from 'worker_threads';

import multer from 'multer';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const TEMP_DIR = path.join(__dirname, 'temp');

// Ensure temp directory exists at startup
if (!fs.existsSync(TEMP_DIR)) {
  fs.mkdirSync(TEMP_DIR, { recursive: true });
}

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    if (!fs.existsSync(TEMP_DIR)) {
      fs.mkdirSync(TEMP_DIR, { recursive: true });
    }
    console.log(`[Multer] Saving file to: ${TEMP_DIR}`);
    cb(null, TEMP_DIR);
  },
  filename: function (req, file, cb) {
    console.log(`[Multer] Filename: uploaded_file.zip`);
    cb(null, 'uploaded_file.zip');
  }
});
const upload = multer({ storage: storage });

async function startServer() {
  const app = express();
  const httpServer = createServer(app);
  const io = new Server(httpServer);
  const PORT = Number(process.env.PORT) || 3000;

  app.use(express.json());

  // File upload endpoint
  app.post('/api/upload', upload.single('file'), (req, res) => {
    if (!req.file) {
      console.error('[Upload] No file received');
      return res.status(400).json({ error: 'No file uploaded' });
    }
    console.log(`[Upload] File saved: ${req.file.path} (${req.file.size} bytes)`);
    res.json({ message: 'File uploaded successfully', filename: req.file.filename });
  });

  // Shutdown endpoint
  app.post('/api/shutdown', (req, res) => {
    console.log('Shutting down server...');
    res.json({ message: 'Server shutting down...' });
    setTimeout(() => {
      process.exit(0);
    }, 500);
  });

  // Socket.io connection handling
  const activeOperations = new Map<string, { cancelled: boolean, ftpClient?: ftp.Client, worker?: Worker }>();

  io.on('connection', (socket) => {
    console.log('Client connected');

    socket.on('test-ftp-connection', async (ftpConfig) => {
      const client = new ftp.Client(ftpConfig.timeout || 30000);
      client.ftp.verbose = true;
      if (ftpConfig.activeMode) {
          client.ftp.active = true;
      }
      try {
        socket.emit('log', `Testing FTP connection (Active: ${!!ftpConfig.activeMode})...`);
        await client.access({
          host: ftpConfig.host,
          user: ftpConfig.user,
          password: ftpConfig.password,
          port: parseInt(ftpConfig.port) || 21,
        });

        socket.emit('log', 'Authenticated. Verifying directory access...');
        const listPath = ftpConfig.remotePath || '/';
        try {
            await client.list(listPath);
            socket.emit('log', 'Directory listing successful!');
            socket.emit('ftp-test-result', { success: true, message: `Connection successful! Verified access to ${listPath}` });
        } catch (listErr: any) {
            throw new Error(`Connected, but failed to list directory "${listPath}": ${listErr.message}`);
        }
      } catch (error: any) {
        socket.emit('log', `FTP Connection Error: ${error.message}`);
        socket.emit('ftp-test-result', { success: false, message: error.message });
      } finally {
        client.close();
      }
    });

    // --- FTP Browser Events ---
    socket.on('ftp-list', async ({ profile, path: remotePath }) => {
        const client = new ftp.Client(profile.timeout || 30000);
        client.ftp.verbose = true;
        if (profile.activeMode) {
            client.ftp.active = true;
        }
        try {
            await client.access({
                host: profile.host,
                user: profile.user,
                password: profile.password,
                port: parseInt(profile.port) || 21,
            });
            const list = await client.list(remotePath);
            socket.emit('ftp-list-success', { path: remotePath, list });
        } catch (error: any) {
            socket.emit('ftp-error', `List Error: ${error.message}`);
        } finally {
            client.close();
        }
    });

    socket.on('ftp-mkdir', async ({ profile, path: remotePath }) => {
        const client = new ftp.Client(profile.timeout || 30000);
        client.ftp.verbose = true;
        if (profile.activeMode) {
            client.ftp.active = true;
        }
        try {
            await client.access({
                host: profile.host,
                user: profile.user,
                password: profile.password,
                port: parseInt(profile.port) || 21,
            });
            await client.ensureDir(remotePath);
            socket.emit('ftp-action-success', `Created directory: ${remotePath}`);
        } catch (error: any) {
            socket.emit('ftp-error', `Create Dir Error: ${error.message}`);
        } finally {
            client.close();
        }
    });

    socket.on('ftp-delete', async ({ profile, path: remotePath, isDir }) => {
        const client = new ftp.Client(profile.timeout || 30000);
        client.ftp.verbose = true;
        if (profile.activeMode) {
            client.ftp.active = true;
        }
        try {
            await client.access({
                host: profile.host,
                user: profile.user,
                password: profile.password,
                port: parseInt(profile.port) || 21,
            });
            if (isDir) {
                await client.removeDir(remotePath);
            } else {
                await client.remove(remotePath);
            }
            socket.emit('ftp-action-success', `Deleted: ${remotePath}`);
        } catch (error: any) {
            socket.emit('ftp-error', `Delete Error: ${error.message}`);
        } finally {
            client.close();
        }
    });
    // --------------------------

    socket.on('cancel-process', () => {
        console.log(`[Cancel] Request from ${socket.id}`);
        const op = activeOperations.get(socket.id);
        if (op) {
            op.cancelled = true;
            if (op.ftpClient) {
                try {
                    op.ftpClient.close();
                } catch (e) {
                    console.error('Error closing FTP client on cancel:', e);
                }
            }
            if (op.worker) {
                try {
                    op.worker.terminate();
                    console.log('Worker terminated.');
                } catch (e) {
                    console.error('Error terminating worker:', e);
                }
            }
            socket.emit('log', 'Cancellation requested. Stopping...');
        }
    });

    socket.on('start-process', async (data) => {
      console.log('[Start-Process] Received request');
      const { ftpConfig, customSubfolder, filename, settings } = data;
      
      activeOperations.set(socket.id, { cancelled: false });
      const currentOp = activeOperations.get(socket.id)!;

      // Use the filename provided by the client (from the upload response), or default
      const actualFilename = filename || 'uploaded_file.zip';
      const uploadPath = path.join(TEMP_DIR, actualFilename);
      const extractPath = path.join(TEMP_DIR, 'extracted');
      
      console.log(`[Start-Process] Looking for file at: ${uploadPath}`);
      
      // Always use the uploaded file
      const sourceFile = uploadPath;

      try {
        if (currentOp.cancelled) throw new Error('Operation cancelled by user.');

        // 0. Pre-flight checks
        if (!ftpConfig.host) throw new Error('FTP Host is missing');

        // 1. Validate File Exists with Retry
        socket.emit('log', 'Verifying uploaded file...');
        
        let fileFound = false;
        for (let i = 0; i < 5; i++) {
            if (currentOp.cancelled) throw new Error('Operation cancelled by user.');
            if (fs.existsSync(sourceFile)) {
                fileFound = true;
                break;
            }
            console.log(`[Start-Process] File not found, retrying (${i+1}/5)...`);
            await new Promise(resolve => setTimeout(resolve, 500));
        }

        if (!fileFound) {
            console.error(`[Start-Process] File not found at ${sourceFile}`);
            if (fs.existsSync(TEMP_DIR)) {
                console.log(`[Start-Process] Temp dir contents:`, fs.readdirSync(TEMP_DIR));
            }
            throw new Error('Uploaded file not found on server. Please try uploading again.');
        }

        const stats = fs.statSync(sourceFile);
        if (stats.size === 0) {
            throw new Error('The uploaded file is empty (0 bytes). Please check the file and try again.');
        }

        console.log('[Start-Process] File found.');
        socket.emit('log', 'File verified.');
        socket.emit('progress', { step: 'upload', progress: 100 });

        if (currentOp.cancelled) throw new Error('Operation cancelled by user.');

        // 2. Extract
        socket.emit('log', 'Starting extraction...');
        // Clean extract directory
        try {
            if (fs.existsSync(extractPath)) {
            fs.rmSync(extractPath, { recursive: true, force: true });
            }
            fs.mkdirSync(extractPath);
        } catch (err: any) {
            throw new Error(`System Error: Failed to prepare extraction directory. ${err.message}`);
        }

        if (currentOp.cancelled) throw new Error('Operation cancelled by user.');

        try {
            // Use Worker Thread for extraction
            await new Promise<void>((resolve, reject) => {
                const worker = new Worker('./workers/extract.js', {
                    workerData: { sourceFile, extractPath }
                });
                
                currentOp.worker = worker;

                worker.on('message', (msg) => {
                    if (msg.success) resolve();
                    else reject(new Error(msg.error));
                });
                
                worker.on('error', reject);
                
                worker.on('exit', (code) => {
                    if (code !== 0) reject(new Error(`Worker stopped with exit code ${code}`));
                });
            });
            
        } catch (err: any) {
            const msg = err.message || err.toString();
            if (msg.includes('Invalid filename')) {
                 throw new Error('Extraction Failed: The archive contains files with invalid names.');
            }
            throw new Error(`Extraction Failed: The archive appears to be corrupted or invalid. Details: ${msg}`);
        } finally {
            currentOp.worker = undefined;
        }
        
        if (currentOp.cancelled) throw new Error('Operation cancelled by user.');

        socket.emit('log', 'Extraction complete.');
        socket.emit('progress', { step: 'extract', progress: 100 });

        // 3. FTP Upload
        socket.emit('log', 'Starting FTP upload...');
        const client = new ftp.Client(ftpConfig.timeout || 30000);
        client.ftp.verbose = true;
        if (ftpConfig.activeMode) {
            client.ftp.active = true;
        }
        currentOp.ftpClient = client;

        try {
          try {
            await client.access({
                host: ftpConfig.host,
                user: ftpConfig.user,
                password: ftpConfig.password,
                port: parseInt(ftpConfig.port) || 21,
                secure: false // Xbox 360 usually doesn't support FTPS
            });
          } catch (connErr: any) {
             if (connErr.code === 'ETIMEDOUT') {
                 throw new Error('FTP Connection Timed Out. Please check if the Xbox is on and connected to the network.');
             } else if (connErr.code === 'ECONNREFUSED') {
                 throw new Error('FTP Connection Refused. Ensure the FTP server is running on your Xbox.');
             } else if (connErr.code === 'ENOTFOUND') {
                 throw new Error(`FTP Host Not Found (${ftpConfig.host}). Check the IP address.`);
             } else if (connErr.code === 530 || connErr.message?.includes('Login incorrect')) {
                 throw new Error('FTP Authentication Failed. Please check your username and password.');
             }
             throw connErr;
          }

          if (currentOp.cancelled) throw new Error('Operation cancelled by user.');

          socket.emit('log', 'Connected to FTP server.');
          
          let uploadDir = ftpConfig.remotePath || '/';
          if (customSubfolder) {
            const cleanSubfolder = customSubfolder.replace(/^\/+|\/+$/g, '');
            const cleanBase = uploadDir.replace(/\/+$/, '');
            uploadDir = `${cleanBase}/${cleanSubfolder}`;
          }
          
          socket.emit('log', `Target directory: ${uploadDir}`);

          try {
              await client.ensureDir(uploadDir);
          } catch (err: any) {
              throw new Error(`FTP Error: Failed to create/access remote directory "${uploadDir}". Permission denied or invalid path.`);
          }
          
          // Calculate total size for progress tracking
          const getDirectorySize = (dir: string): number => {
            let size = 0;
            try {
                const files = fs.readdirSync(dir);
                for (const file of files) {
                const filePath = path.join(dir, file);
                const stats = fs.statSync(filePath);
                if (stats.isDirectory()) {
                    size += getDirectorySize(filePath);
                } else {
                    size += stats.size;
                }
                }
            } catch (e) {
                console.warn('Error calculating directory size:', e);
            }
            return size;
          };

          const totalSize = getDirectorySize(extractPath);
          let totalTransferred = 0;
          let lastLogTime = 0;

          client.trackProgress(info => {
             totalTransferred += info.bytes;
             
             if (totalSize > 0) {
               const percent = (totalTransferred / totalSize) * 100;
               socket.emit('progress', { step: 'ftp', progress: Math.min(percent, 100) });
             }

             const now = Date.now();
             if (now - lastLogTime > 1000) {
                socket.emit('log', `Uploading... ${(totalTransferred / 1024 / 1024).toFixed(2)} MB / ${(totalSize / 1024 / 1024).toFixed(2)} MB`);
                lastLogTime = now;
             }
          });

          if (currentOp.cancelled) throw new Error('Operation cancelled by user.');

          await client.uploadFromDir(extractPath, uploadDir);
          
          socket.emit('log', 'FTP upload complete.');
          socket.emit('progress', { step: 'ftp', progress: 100 });

        } catch (ftpError: any) {
          if (ftpError.message && (ftpError.message.startsWith('FTP') || ftpError.message.startsWith('System') || ftpError.message.includes('cancelled'))) {
              throw ftpError;
          }
          if (currentOp.cancelled) {
              throw new Error('Operation cancelled by user.');
          }
          throw new Error(`FTP Transfer Error: ${ftpError.message}`);
        } finally {
          if (settings?.autoDisconnect !== false) { // Default to true if undefined, or respect setting
             client.close();
          }
        }

        socket.emit('complete', 'All tasks finished successfully!');

      } catch (error: any) {
        console.error(error);
        socket.emit('error', error.message || 'Unknown error occurred');
      } finally {
        activeOperations.delete(socket.id);
        // Cleanup temp files
        if (fs.existsSync(uploadPath)) fs.unlinkSync(uploadPath);
        if (fs.existsSync(extractPath)) fs.rmSync(extractPath, { recursive: true, force: true });
      }
    });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    // Serve static files in production
    app.use(express.static(path.join(__dirname, 'dist')));
    
    // SPA fallback
    app.get('*', (req, res) => {
      res.sendFile(path.join(__dirname, 'dist', 'index.html'));
    });
  }

  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
