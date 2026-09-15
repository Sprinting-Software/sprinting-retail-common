import { LoggerService } from "./LoggerService"
import { LegacyLoggerService } from "./LegacyLoggerService"
import { ConfigMapper } from "../config/legacyInterfaces/ConfigMapper"
import { ApmHelper } from "../apm/ApmHelper"
import { DynamicModule, Global, Module } from "@nestjs/common"
import { ConfigModule } from "../config/ConfigModule"
import { ElkV7Config, ElkV9Config, LibConfig } from "../config/interface/LibConfig"
import { RetailCommonConfigProvider } from "../config/RetailCommonConfigProvider"
import { LoggerService2 } from "./LoggerService2"
import { AsyncContext } from "../asyncLocalContext/AsyncContext"
import { BulkLogService, ELK_V9_CONFIG } from "./BulkLogService"
import { ElkV9LoggerService } from "./ElkV9LoggerService"

@Module({})
@Global()
export class LoggerModule {
  static forRootV2(config: LibConfig & ElkV7Config): DynamicModule {
    return {
      module: LoggerModule,
      providers: [
        {
          provide: LoggerService,
          useFactory: (asyncContext?: AsyncContext) => new LegacyLoggerService(config, undefined, asyncContext),
          // Optional: the logger enriches logs with async/trace context when AsyncContextModule
          // is present, but must not force every consumer of CommonAppModule to import it.
          inject: [{ token: AsyncContext, optional: true }],
        },
        LoggerService2,
        {
          provide: ApmHelper,
          useValue: ApmHelper.Instance,
        },
      ],
      exports: [LoggerService, LoggerService2, ApmHelper],
    }
  }

  static forRootV3(config: LibConfig & ElkV9Config): DynamicModule {
    return {
      module: LoggerModule,
      providers: [
        {
          provide: ELK_V9_CONFIG,
          useValue: config.elkRestApi,
        },
        BulkLogService,
        {
          provide: LoggerService,
          useFactory: (bulk: BulkLogService, asyncContext?: AsyncContext) =>
            new ElkV9LoggerService(config, bulk, asyncContext),
          inject: [BulkLogService, { token: AsyncContext, optional: true }],
        },
        LoggerService2,
        {
          provide: ApmHelper,
          useValue: ApmHelper.Instance,
        },
      ],
      exports: [LoggerService, LoggerService2, ApmHelper],
    }
  }
  /**
   * @deprecated Use `forRootV2` instead.
   * We need to use the forRoot pattern here, because we need the ApmHelper to be instantiated via useValue instead of useFactory
   * in order to ensure that APM is initialized before the Nest Application is initialized.
   * @param provider
   */

  static forRoot(provider: RetailCommonConfigProvider): DynamicModule {
    return {
      module: LoggerModule,
      imports: [ConfigModule],
      providers: [
        {
          provide: LoggerService,
          useFactory: (asyncContext?: AsyncContext) => {
            const loggerConfig = ConfigMapper.mapToLoggerConfig(provider.config)
            return new LegacyLoggerService(loggerConfig, undefined, asyncContext)
          },
          // Optional: see forRootV2 above — keeps AsyncContext a soft, opt-in dependency.
          inject: [{ token: AsyncContext, optional: true }],
        },
        LoggerService2,
        {
          provide: ApmHelper,
          useValue: ApmHelper.Instance,
        },
      ],
      exports: [LoggerService, LoggerService2, ApmHelper],
    }
  }
}
