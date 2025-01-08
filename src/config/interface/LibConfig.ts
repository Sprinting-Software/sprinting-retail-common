import { PrincipalName } from "../../baseData/PrincipalName"

/**
 * This configuration is used to configure the instantiation of this library
 */
export interface LibConfig {
  env: string
  isProdZone?: boolean
  serviceName: PrincipalName
  /**
   * If set to false, then no logs or events will be sent to ELK.
   * APM may still be sent.
   */
  enableElkLogs: boolean
  enableConsoleLogs: boolean
  elkRestApi?: {
    /**
     * Set to true if events should be sent via the Elastic Rest API instead of over UDP.
     * This will remove the limitation of UDP which can only send a limited amount of data per event.
     */
    useForEvents: boolean
    useForErrors: boolean
    endpoint: string
    apiKey: string
  }
  elkLogstash: {
    isUDPEnabled: boolean
    host: string
    port: number
  }
}
