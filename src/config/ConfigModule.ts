import { DynamicModule, Global, Module } from "@nestjs/common"
import { RetailCommonConfig } from "./interface/RetailCommonConfig"
import { RetailCommonConfigProvider } from "./RetailCommonConfigProvider"

@Module({})
@Global()
export class ConfigModule {
  static forRoot(retailCommonConfig: RetailCommonConfig): DynamicModule {
    return {
      module: ConfigModule,
      providers: [
        {
          provide: RetailCommonConfigProvider,
          useFactory: () => new RetailCommonConfigProvider(retailCommonConfig),
        },
      ],
      exports: [RetailCommonConfigProvider],
    }
  }
}
