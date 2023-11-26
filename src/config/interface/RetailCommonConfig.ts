import { IApmConfig } from "./IApmConfig"
import { EnvironmentConfig } from "./EnvironmentConfig"

/**
 * The new configuration format recommended for new services.
 */
export interface RetailCommonConfig extends EnvironmentConfig {
  systemName: string
  enableConsoleLogs: boolean
  elk: {
    apm: IApmConfig
    logstash: {
      isEnabled: boolean
      host: string
      port: number
    }
  }
}
