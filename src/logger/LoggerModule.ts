import { LoggerService } from "./LoggerService"
import { ConfigMapper } from "../config/legacyInterfaces/ConfigMapper"
import { ApmHelper } from "../apm/ApmHelper"
import { DynamicModule, Module } from "@nestjs/common"
import { ConfigModule } from "../config/ConfigModule"
import { LoggerConfig } from "./LoggerConfig"
import { RetailCommonConfigProvider } from "../config/RetailCommonConfigProvider"

@Module({})
export class LoggerModule {
  /**
   * We need to use the forRoot pattern here, because we need the ApmHelper to be instantiated via useValue instead of useFactory
   * in order to ensure that APM is initialized before the Nest Application is initialized.
   * @param provider
   */
  static forRoot(provider: RetailCommonConfigProvider): DynamicModule {
    const loggerConfig: LoggerConfig = ConfigMapper.mapToLoggerConfig(provider.config)
    return {
      module: LoggerModule,
      imports: [ConfigModule],
      providers: [
        {
          provide: LoggerService,
          useValue: new LoggerService(loggerConfig),
        },
        {
          provide: ApmHelper,
          useValue: new ApmHelper(provider.config.elk.apm),
        },
      ],
      exports: [LoggerService, ApmHelper],
    }
  }
}
