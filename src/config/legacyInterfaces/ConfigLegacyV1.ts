/**
 * The old configuration format recommended used on older projects
 */
export interface ConfigLegacyV1 {
  envPrefix: string
  enableConsoleLogs: boolean
  elkConfig: {
    serviceName: string
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
