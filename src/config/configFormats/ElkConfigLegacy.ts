/**
 * This configuration is used to configure the ELK logging in the legacy way.
 * It is preferred to use the ElkConfig instead.
 */
export interface ElkConfigLegacy {
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
