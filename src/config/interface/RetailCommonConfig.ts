import { IApmConfig } from "./IApmConfig"
import { EnvironmentConfig } from "./EnvironmentConfig"
import { PrincipalName } from "../../baseData/PrincipalName"

/**
 * @deprecated Use LoggerConfig instead
 * The new configuration format recommended for new services.
 */
export interface RetailCommonConfig extends EnvironmentConfig {
  systemName: PrincipalName
  enableConsoleLogs: boolean
  elk: {
    apm: IApmConfig
    restApi?: {
      useForEvents: boolean
      useForErrors: boolean
      endpoint: string
      apiKey: string
    }
    logstash: {
      isEnabled: boolean
      host: string
      port: number
    }
  }
}
