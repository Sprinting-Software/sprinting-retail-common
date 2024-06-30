import { RetailCommonConfig } from "./interface/RetailCommonConfig"
import { RetailCommonConfigConvict } from "./interface/RetailCommonConfigConvict"
export const UNKNOWN_ENV_PREFIX = "z"
/**
 * A wrapper around the configuration of sprinting-retail-common that helps with validation.
 * It also makes it easier to deal with dependency injection as DI in Nest only works with classes,
 * not interfaces (unless we should use provider tokens)
 */
export class RetailCommonConfigProvider {
  public readonly config: RetailCommonConfig
  constructor(readonly _config: RetailCommonConfig) {
    if (!_config.envPrefix && process.env.NODE_ENV !== "test") {
      // eslint-disable-next-line no-console
      console.log(
        "********* WARNING *********\nNo environment prefix was specified. Using z as envPrefix. Change it by providing NODE_ENV as environment variable.\n***************************** "
      )
    }
    this.config = { ..._config, envPrefix: this.extractEnvLetter(_config.envPrefix || UNKNOWN_ENV_PREFIX) }
    RetailCommonConfigConvict.validate(this.config)
  }

  private extractEnvLetter(env: string) {
    if (env.indexOf("-")) return env.split("-")[0]
    else return env
  }
}
