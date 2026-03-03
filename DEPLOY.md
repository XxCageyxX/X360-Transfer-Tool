# Deployment Instructions

This application consists of a React frontend and a Node.js/Express backend. Because it relies on a custom backend for FTP proxying and WebSocket communication, it requires a runtime environment that supports long-running Node.js processes.

## Google Cloud Run (Recommended)

Google Cloud Run is ideal for this application as it supports Docker containers and can handle the WebSocket connections and long-running FTP tasks.

### Prerequisites
- Google Cloud Platform (GCP) Account
- gcloud CLI installed and authenticated

### Steps

1. **Build the Docker Image**
   ```bash
   gcloud builds submit --tag gcr.io/YOUR_PROJECT_ID/x360-transfer-tool
   ```

2. **Deploy to Cloud Run**
   ```bash
   gcloud run deploy x360-transfer-tool \
     --image gcr.io/YOUR_PROJECT_ID/x360-transfer-tool \
     --platform managed \
     --region us-central1 \
     --allow-unauthenticated \
     --port 8080 \
     --session-affinity
   ```
   *Note: `--session-affinity` is recommended for Socket.IO stability.*

3. **Environment Variables**
   If you need to set environment variables (e.g., for Firebase), add them with `--set-env-vars`:
   ```bash
   --set-env-vars "NODE_ENV=production,ANOTHER_VAR=value"
   ```

## Vercel (Not Recommended)

Vercel is primarily for static sites and Serverless Functions. While you can deploy the frontend to Vercel, the backend requirements of this app (WebSockets, long-running FTP uploads, local file system access for extraction) make it **unsuitable** for Vercel Serverless Functions.

**Why Vercel won't work easily:**
1. **Timeouts:** Serverless functions have strict execution time limits (usually 10-60 seconds). FTP uploads often take longer.
2. **WebSockets:** Vercel Serverless Functions do not support persistent WebSocket connections.
3. **File System:** Serverless environments have ephemeral file systems. Writing large ZIP files and extracting them might exceed storage limits or be lost between requests.

**Alternative Hybrid Approach:**
- Deploy the **Frontend** to Vercel.
- Deploy the **Backend** to a VPS (DigitalOcean, Linode) or Cloud Run.
- Update the frontend to connect to the separate backend URL.

## Local Development

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Run Development Server**
   ```bash
   npm run dev
   ```
   Access at `http://localhost:3000`.

## Production Build (Local)

1. **Build**
   ```bash
   npm run build
   ```

2. **Start**
   ```bash
   npm start
   ```
