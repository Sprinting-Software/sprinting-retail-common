import { ApmConfig } from "./ApmConfig"
import { EnvironmentConfig } from "./EnvironmentConfig"

/**
 * The new configuration format recommended for new services.
 */
export interface RetailCommonConfig extends EnvironmentConfig {
  systemName: string
  elk: {
    apm: ApmConfig
    logstash: {
      isEnabled: boolean
      host: string
      port: number
    }
  }
}
