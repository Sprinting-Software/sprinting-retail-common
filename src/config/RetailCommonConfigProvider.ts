import { RetailCommonConfig } from "./interface/RetailCommonConfig"
import { RetailCommonConfigConvict } from "./interface/RetailCommonConfigConvict"

/**
 * A wrapper around the configuration of sprinting-retail-common that helps with validation.
 * It also makes it easier to deal with dependency injection as DI in Nest only works with classes,
 * not interfaces (unless we should use provider tokens)
 */
export class RetailCommonConfigProvider {
  public readonly config: RetailCommonConfig
  constructor(readonly _config: RetailCommonConfig) {
    this.config = { ..._config, envPrefix: this.extractEnvLetter(_config.envPrefix) }
    RetailCommonConfigConvict.validate(this.config)
  }

  private extractEnvLetter(env: string) {
    if (env.indexOf("-")) return env.split("-")[0]
    else return env
  }
}
