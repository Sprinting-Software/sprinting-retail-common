import { DynamicModule, Global, Module } from "@nestjs/common"
import { RetailCommonConfigProvider } from "./RetailCommonConfigProvider"

@Module({})
@Global()
export class ConfigModule {
  static forRoot(configProvider: RetailCommonConfigProvider): DynamicModule {
    return {
      module: ConfigModule,
      providers: [
        {
          provide: RetailCommonConfigProvider,
          useValue: configProvider,
        },
      ],
      exports: [RetailCommonConfigProvider],
    }
  }
}
