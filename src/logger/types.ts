/**
 * Shared context data for all log records
 */
export interface ICommonLogContext {
  tenantId: number
  clientTraceId?: string
  userId?: string
  requestTraceId?: string
  transactionName?: string
}

export const enum LogLevel {
  info = "info",
  event = "event",
  debug = "debug",
  error = "error",
  warn = "warn",
}

export interface LogMessage {
  filename: string
  system: string
  component: string
  env: string
  systemEnv: string
  logType: LogLevel
  message: string
  event?: Record<string, any>
  context?: Omit<ICommonLogContext, "tenantId"> & { tenant: string }
}

export type ElkRestApiConfig = {
  endpoint: string
  apiKey: string
  indexName: string
}
