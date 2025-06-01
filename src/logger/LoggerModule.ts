import { LoggerService } from "./LoggerService"
import { ConfigMapper } from "../config/legacyInterfaces/ConfigMapper"
import { ApmHelper } from "../apm/ApmHelper"
import { DynamicModule, Global, Module } from "@nestjs/common"
import { ConfigModule } from "../config/ConfigModule"
import { LibConfig } from "../config/interface/LibConfig"
import { RetailCommonConfigProvider } from "../config/RetailCommonConfigProvider"
import { LoggerServiceV2 } from "./LoggerServiceV2"
import { ApplicationAsyncContextModule } from "../localasynccontext/ApplicationAsyncContextModule"

@Module({})
@Global()
export class LoggerModule {
  /**
   * @deprecated Use `forRootV2` instead.
   * We need to use the forRoot pattern here, because we need the ApmHelper to be instantiated via useValue instead of useFactory
   * in order to ensure that APM is initialized before the Nest Application is initialized.
   * @param provider
   */

  static forRoot(provider: RetailCommonConfigProvider): DynamicModule {
    return {
      module: LoggerModule,
      imports: [ConfigModule, ApplicationAsyncContextModule],
      providers: [
        {
          provide: LoggerService,
          useFactory: () => {
            const loggerConfig = ConfigMapper.mapToLoggerConfig(provider.config)
            return new LoggerService(loggerConfig)
          },
        },
        LoggerServiceV2,
        {
          provide: ApmHelper,
          useValue: ApmHelper.Instance,
        },
      ],
      exports: [LoggerService, LoggerServiceV2, ApmHelper],
    }
  }
  static forRootV2(config: LibConfig): DynamicModule {
    return {
      module: LoggerModule,
      imports: [ApplicationAsyncContextModule],
      providers: [
        {
          provide: LoggerService,
          useValue: new LoggerService(config),
        },
        LoggerServiceV2,
        {
          provide: ApmHelper,
          useValue: ApmHelper.Instance,
        },
      ],
      exports: [LoggerService, LoggerServiceV2, ApmHelper],
    }
  }
}
