import { DynamicModule, Global, Module } from "@nestjs/common"
import { CommonConfigService, CONFIG_PROVIDER_TOKEN } from "./CommonConfigService"
import { IConfigProvider } from "./IConfigProvider"

/**
 * This is used for internal configuration of sprinting-retail-common
 */
@Global()
@Module({})
export class ConfigModule {
  static register(config: IConfigProvider): DynamicModule {
    return {
      module: ConfigModule,
      providers: [
        {
          provide: CommonConfigService,
          useFactory: () => new CommonConfigService(config),
        },
      ],
      exports: [CommonConfigService],
    }
  }
}
