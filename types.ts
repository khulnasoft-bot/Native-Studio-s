export type Plan = {
  task: string;
  steps: string[];
  filesToEdit: string[]; // relative paths
  metadata?: Record<string, any>;
};

export type FileContext = {
  path: string;
  content: string;
};

export type CodePatch = {
  filePath: string;
  diff: string; // unified diff string
  ok?: boolean;
};

export type Review = {
  ok: boolean;
  issues: string[];
};

export type PipelineStep = 'IDLE' | 'ARCHITECT' | 'FILEOPS' | 'CODER' | 'REVIEWER' | 'APPLYING' | 'DONE' | 'FAILED';

export interface LogEntry {
  id: string;
  timestamp: number;
  source: 'Controller' | 'Architect' | 'Coder' | 'Reviewer' | 'FileOps';
  message: string;
  details?: any;
  type: 'info' | 'success' | 'error' | 'warning';
}

export interface VirtualFile {
  path: string;
  content: string;
}