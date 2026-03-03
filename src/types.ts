export interface FtpProfile {
  id: string;
  name: string;
  host: string;
  port: string;
  user: string;
  password?: string;
  remotePath: string;
  activeMode?: boolean;
  timeout?: number;
}

export interface ProgressData {
  step: 'upload' | 'extract' | 'ftp';
  progress: number;
}

export interface LogMessage {
  timestamp: string;
  message: string;
  type: 'info' | 'success' | 'error' | 'warning';
}
