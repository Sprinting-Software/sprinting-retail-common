import { PrincipalEnum } from "../../baseData/PrincipalEnum"

/**
 * The old configuration format recommended used on older projects
 */
export interface ConfigLegacyV1 {
  envPrefix: string
  enableConsoleLogs: boolean
  elkConfig: {
    serviceName: PrincipalEnum
    hostname: string
    port: number
    serviceSecret: string
    sendLogsToElk: boolean
    logstashConfig: {
      hostname: string
      port: number
    }
  }
}
