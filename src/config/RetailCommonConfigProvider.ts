import { RetailCommonConfig } from "./interface/RetailCommonConfig"
import { RetailCommonConfigConvict } from "./interface/RetailCommonConfigConvict"

/**
 * A thin wrapper around the configuration of sprinting-retail-common that helps with dependency injection.
 */
export class RetailCommonConfigProvider {
  constructor(public readonly config: RetailCommonConfig) {
    RetailCommonConfigConvict.validate(config)
  }
}
