import { DynamicModule, Global, Module, Scope } from "@nestjs/common";
import { ConfigModule } from "../config/ConfigModule"
import { LoggerModule } from "../logger/LoggerModule"
import { APP_FILTER, REQUEST } from "@nestjs/core"
import { LoggerService } from "../logger/LoggerService"
import TenantContext from "../context/TenantContext"
import { GlobalErrorFilter } from "../errorHandling/GlobalErrorFilter"
import { TenantContextFactory } from "../context/TenantContextFactory"
import { IConfigProvider } from "../config/IConfigProvider"

/**
 * Import this module from AppModule in your projects like this:
 * imports: [CommonAppModule.register(config),...]
 * You must pass in a config object that
 */
@Global()
@Module({})
export class CommonAppModule {
  static register(config: IConfigProvider): DynamicModule {
    return this.registerUtil(config)
  }

  private static registerUtil(config: IConfigProvider) {
    return {
      module: CommonAppModule,
      imports: [ConfigModule.register(config), LoggerModule],
      exports: [LoggerModule, TenantContext],
      controllers: [],
      providers: [
        {
          provide: TenantContext,
          scope: Scope.REQUEST,
          useFactory: (request: Request) => TenantContextFactory.getTenantContext(request),
          inject: [REQUEST]
        },
        {
          provide: APP_FILTER,
          useFactory: (logger: LoggerService, tenantContext: TenantContext) =>
            new GlobalErrorFilter(logger, { tenantId: tenantContext.tenantIdOrUndefined }),
          inject: [LoggerService, TenantContext],
          scope: Scope.REQUEST
        }
      ]
    };
  }
}
