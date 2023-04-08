import { Injectable } from "@nestjs/common"
import { IConfigElk } from "./IConfigElk"
import { IConfigRoot } from "./IConfigRoot"
import { IConfigProvider } from "./IConfigProvider"

@Injectable()
export class CommonConfigService implements IConfigRoot {
  constructor(private configService: IConfigProvider) {}

  public get env(): string {
    return process.env.NODE_ENV // this.configService.get('NODE_ENV');
  }

  public get envPrefix(): string {
    return this.env.split("-")[0]
  }

  private getProp<T>(field: string): T {
    if (this.configService.has) {
      // If we rely on the node config module we need to guard like this
      return this.configService.has(field) ? this.configService.get<T>(field) : undefined
    } else {
      return this.configService.get<T>(field)
    }
  }
  public get elkConfig(): IConfigElk {
    return this.getProp<IConfigElk>("elk") as IConfigElk
  }
}
