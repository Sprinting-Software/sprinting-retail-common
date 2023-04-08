import { Injectable } from "@nestjs/common"
import { ElkConfig } from "./configFormats/ElkConfig"
import { AppConfig } from "./configFormats/AppConfig"
import { IConfigProvider } from "./IConfigProvider"

@Injectable()
export class CommonConfigService implements AppConfig {
  getRawConfig(): any {
    return this.config
  }
  private config: IConfigProvider
  constructor(config: IConfigProvider) {
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
  public get elkConfig(): ElkConfig {
    return this.getProp<ElkConfig>("elk") as ElkConfig
  }
}
