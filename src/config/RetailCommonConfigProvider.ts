import { RetailCommonConfig } from "./interface/RetailCommonConfig"
import { RetailCommonConfigConvict } from "./interface/RetailCommonConfigConvict"

/**
 * A wrapper around the configuration of sprinting-retail-common that helps with validation.
 * It also makes it easier to deal with dependency injection as DI in Nest only works with classes,
 * not interfaces (unless we should use provider tokens)
 */
export class RetailCommonConfigProvider {
  constructor(public readonly config: RetailCommonConfig) {
    RetailCommonConfigConvict.validate(config)
  }
}
