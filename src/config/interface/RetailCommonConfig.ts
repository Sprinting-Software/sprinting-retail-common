import { IApmConfig } from "./IApmConfig"
import { EnvironmentConfig } from "./EnvironmentConfig"
import { PrincipalEnum } from "../../baseData/PrincipalEnum"

/**
 * The new configuration format recommended for new services.
 */
export interface RetailCommonConfig extends EnvironmentConfig {
  systemName: PrincipalEnum
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
