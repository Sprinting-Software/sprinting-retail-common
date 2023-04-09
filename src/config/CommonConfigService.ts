import { Inject, Injectable } from "@nestjs/common"
import { ElkConfigLegacy } from "./configFormats/ElkConfigLegacy"
import { RetailCommonConfigLegacy } from "./configFormats/RetailCommonConfigLegacy"
import { IConfigProvider } from "./IConfigProvider"
import { ClientException } from "../errorHandling/ClientException"

export const CONFIG_PROVIDER_TOKEN = "CONFIG_PROVIDER"
@Injectable()
export class CommonConfigService implements RetailCommonConfigLegacy {
  getRawConfig(): IConfigProvider {
    return this.config
  }
  private config: IConfigProvider
  constructor(@Inject(CONFIG_PROVIDER_TOKEN) config: IConfigProvider) {
    if (!config) {
      throw new ClientException("MissingConfiguration", `Configuration must be provided. Found ${config}`)
    }
    this.config = config
  }

  public get env(): string {
    return process.env.NODE_ENV // this.config.get('NODE_ENV');
  }

  public get envPrefix(): string {
    return this.env.split("-")[0]
  }

  private getProp<T>(field: string): T {
    if (this.config.has) {
      // If we rely on the node config module we need to guard like this
      return this.config.has(field) ? this.config.get<T>(field) : undefined
    } else {
      return this.config.get<T>(field)
    }
  }
  public get elkConfig(): ElkConfigLegacy {
    return this.getProp<ElkConfigLegacy>("elk") as ElkConfigLegacy
  }
}
