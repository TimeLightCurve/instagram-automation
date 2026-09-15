export type InstagramAccountView = {
  configured: boolean;
  connected: boolean;
  id?: string;
  username?: string;
  name?: string;
  accountType?: string;
  profilePictureUrl?: string;
  scopes?: string[];
  tokenExpiresAt?: string;
  lastVerifiedAt?: string;
  status?: 'connected' | 'expired' | 'disconnected' | 'error';
  missingConfiguration?: string[];
};

export type JobStatus = 'completed' | 'failed' | 'blocked' | 'running';

export type JobView = {
  id: string;
  kind: string;
  status: JobStatus;
  summary: string;
  startedAt: string;
  finishedAt?: string;
  durationMs?: number;
};

export type MonitoringSnapshot = {
  database: 'connected' | 'not-configured' | 'unavailable';
  account: InstagramAccountView;
  totals: {
    all: number;
    completed: number;
    failed: number;
    blocked: number;
    last24Hours: number;
  };
  recentJobs: JobView[];
  checkedAt: string;
};
