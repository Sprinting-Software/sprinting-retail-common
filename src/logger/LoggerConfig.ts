export interface LoggerConfig {
  env: string
  serviceName: string
  enableLogs: boolean
  logstash: {
    isUDPEnabled: boolean
    host: string
    port: number
  }
}
