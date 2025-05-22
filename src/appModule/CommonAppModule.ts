import { DynamicModule, Global, Module, Scope } from "@nestjs/common"
import { ConfigModule } from "../config/ConfigModule"
import { LoggerModule } from "../logger/LoggerModule"
import { APP_FILTER, HttpAdapterHost, REQUEST } from "@nestjs/core"
import { LibConfig } from "../config/interface/LibConfig"
import { LoggerService } from "../logger/LoggerService"
import TenantContext from "../context/TenantContext"
import { GlobalErrorFilter } from "../errorHandling/GlobalErrorFilter"
import { TenantContextFactory } from "../context/TenantContextFactory"
import { RetailCommonConfig } from "../config/interface/RetailCommonConfig"
import { ConfigMapper } from "../config/legacyInterfaces/ConfigMapper"
import { LoadBalancingTimeoutBootstrap } from "../helpers/LoadBalancingTimeoutBootstrap"
import { RetailCommonConfigProvider } from "../config/RetailCommonConfigProvider"
import { ApmHelper } from "../apm/ApmHelper"
import { SeederModule } from "../seeder/SeederModule"
import { LibraryDebugFlags } from "../config/LibraryDebugFlags"

/**
 * Import this module from AppModule in your projects like this:
 * imports: [CommonAppModule.register(config),...]
 * You must pass in a config object that
 */
@Global()
@Module({})
export class CommonAppModule {
  /**
   * @deprecated Use forRootV2 instead
   * @param config
   * @returns
   */
  static forRootObsolete(config: RetailCommonConfig): DynamicModule {
    const configProvider = new RetailCommonConfigProvider(config)
    this.setupGlobalProcessHandlersObsolete(configProvider)

    return {
      module: CommonAppModule, // needed for dynamic modules
      imports: [ConfigModule.forRoot(configProvider), LoggerModule.forRoot(configProvider), SeederModule],
      providers: [
        {
          provide: ApmHelper,
          useValue: ApmHelper.Instance,
        },
        {
          provide: LoadBalancingTimeoutBootstrap,
          useFactory: (refHost: HttpAdapterHost<any>, logger: LoggerService) =>
            new LoadBalancingTimeoutBootstrap(refHost, logger),
          inject: [HttpAdapterHost, LoggerService],
        },
        {
          provide: TenantContext,
          scope: Scope.REQUEST,
          useFactory: (request: Request) => TenantContextFactory.getTenantContext(request),
          inject: [REQUEST],
        },
        {
          provide: APP_FILTER,
          useFactory: (logger: LoggerService, tenantContext: TenantContext) =>
            new GlobalErrorFilter(logger, { tenantId: tenantContext.tenantIdOrUndefined }, config.isProduction),
          inject: [LoggerService, TenantContext],
          scope: Scope.REQUEST,
        },
      ],
      exports: [ConfigModule, LoggerModule, TenantContext, ApmHelper, SeederModule],
    }
  }
  static forRoot(config: LibConfig): DynamicModule {
    if (!config.skipGlobalProcessHandlers) this.setupGlobalProcessHandlers(config)
    const _isProduction = LibraryDebugFlags.SimulateProduction() || config.isProdZone
    return {
      module: CommonAppModule, // needed for dynamic modules
      imports: [LoggerModule.forRootV2(config), SeederModule],
      providers: [
        {
          provide: ApmHelper,
          useValue: ApmHelper.Instance,
        },
        {
          provide: LoadBalancingTimeoutBootstrap,
          useFactory: (refHost: HttpAdapterHost<any>, logger: LoggerService) =>
            new LoadBalancingTimeoutBootstrap(refHost, logger),
          inject: [HttpAdapterHost, LoggerService],
        },
        {
          provide: TenantContext,
          scope: Scope.REQUEST,
          useFactory: (request: Request) => TenantContextFactory.getTenantContext(request),
          inject: [REQUEST],
        },
        {
          provide: APP_FILTER,
          useFactory: (logger: LoggerService, tenantContext: TenantContext) =>
            new GlobalErrorFilter(logger, { tenantId: tenantContext.tenantIdOrUndefined }, _isProduction),
          inject: [LoggerService, TenantContext],
          scope: Scope.REQUEST,
        },
      ],
      exports: [LoggerModule, TenantContext, ApmHelper, SeederModule],
    }
  }

  /**
   * Assigns the global handler on unhandledRejections
   * @param configProvider
   * @private
   */
  private static setupGlobalProcessHandlersObsolete(configProvider: RetailCommonConfigProvider) {
    const loggerConfig: LibConfig = ConfigMapper.mapToLoggerConfig(configProvider.config)
    CommonAppModule.setupGlobalProcessHandlers(loggerConfig)
  }

  public static setupGlobalProcessHandlers(loggerConfig: LibConfig) {
    const logger = new LoggerService(loggerConfig)

    if (process.listenerCount("unhandledRejection") > 0) {
      try {
        logger.warn(
          "CommonAppModule",
          "There is already an 'unhandledRejection' handler, not adding sprinting-retail-common one."
        )
      } catch (err) {
        //Suppress errors in error handling
        // eslint-disable-next-line no-console
        console.log("There is already an 'unhandledRejection' handler, not adding sprinting-retail-common one.")
      }
    } else {
      process
        .on("unhandledRejection", (reason) => {
          const msg = "A Promise rejection was not handled."
          // eslint-disable-next-line no-console
          console.log("UnhandledRejectionError", msg, reason)
          try {
            logger.logException("UnhandledRejectionError", msg, undefined, <Error>reason)
          } catch (err) {
            // eslint-disable-next-line no-console
            console.log("Error while trying to report an UnhandledRejectionError", err)
          }
        })
        .on("uncaughtException", (reason) => {
          const msg = "An exception was not caught properly."
          // eslint-disable-next-line no-console
          console.log("UncaughtException", msg, reason)
          try {
            logger.logException("UncaughtException", msg, undefined, <Error>reason)
          } catch (err) {
            // eslint-disable-next-line no-console
            console.log("Error while trying to report an UncaughtException", err)
          }
        })
    }
  }
}
