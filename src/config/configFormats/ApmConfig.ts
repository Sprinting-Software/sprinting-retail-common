export interface ApmConfig {
  enableLogs: boolean;
  serviceName: string;
  serverUrl: string;
  secretToken?: string;
  transactionSampleRate?: number;
  labels?: Record<string, string>;
  captureErrorLogStackTraces?: boolean;
  captureExceptions?: boolean;
  centralConfig?: boolean;
  metricsInterval?: number;
}