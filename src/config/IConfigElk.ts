export interface IConfigElk {
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
