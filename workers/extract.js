import { parentPort, workerData } from 'worker_threads';
import AdmZip from 'adm-zip';

const { sourceFile, extractPath } = workerData;

try {
    const zip = new AdmZip(sourceFile);
    const zipEntries = zip.getEntries();
    
    if (zipEntries.length === 0) {
         throw new Error('The archive contains no files.');
    }
    
    zip.extractAllTo(extractPath, true);
    if (parentPort) parentPort.postMessage({ success: true });
} catch (err) {
    if (parentPort) parentPort.postMessage({ success: false, error: err.message });
}
