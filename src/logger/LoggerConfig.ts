export interface LoggerConfig {
  env: string
  serviceName: string
  enableLogs: boolean
  enableConsoleLogs: boolean
  logstash: {
    isUDPEnabled: boolean
    host: string
    port: number
  }
}
