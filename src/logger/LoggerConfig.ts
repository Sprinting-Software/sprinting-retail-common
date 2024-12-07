import { PrincipalEnum } from "../baseData/PrincipalEnum"

export interface LoggerConfig {
  env: string
  serviceName: PrincipalEnum
  enableLogs: boolean
  enableConsoleLogs: boolean
  logstash: {
    isUDPEnabled: boolean
    isTCPEnabled?: boolean
    host: string
    port: number
  }
}
