import { ApmConfig } from "./ApmConfig"

/**
 * The new configuration format recommended for new services.
 */
export interface RetailCommonConfig {
  envPrefix: string
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
