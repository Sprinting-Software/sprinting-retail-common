import { DynamicModule, Global, MiddlewareConsumer, Module, NestModule } from "@nestjs/common"
import { AsyncContext } from "./AsyncContext"
import { AsyncContextMiddleware } from "./AsyncContextMiddleware"
import { APP_GUARD, Reflector } from "@nestjs/core"
import { setApmLabelCallback, AsyncContextOptions } from "./types"
import { ApmHelper } from "../apm/ApmHelper"
import { TenantContextGuard } from "./TenantContextGuard"
import { TraceContextMiddleware } from "./TraceContextMiddleware"
import { SystemContextBase } from "./SystemContextBase"
@Global()
@Module({})
export class AsyncContextModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(AsyncContextMiddleware, TraceContextMiddleware).forRoutes("*")
  }

  /**
   * Creates the async local context for the entire application, using the provided default context as fallback
   * until the first async context is established.
   * @param defaultContext
   * @returns
   */
  static forRoot(
    defaultContext?: object,
    options?: AsyncContextOptions,
    setApmLabel?: setApmLabelCallback
  ): DynamicModule {
    const _setApmLabel = setApmLabel
      ? setApmLabel
      : (key: string, value: string) => {
          if (value === undefined || value === null) return
          const valueStr = value.toString()
          return ApmHelper.Instance.setLabelOnCurrentTransaction(key, valueStr)
        }
    return {
      module: AsyncContextModule,
      providers: [
        {
          provide: AsyncContext,
          useFactory: () => new AsyncContext(defaultContext, options, _setApmLabel),
        },
        AsyncContextMiddleware,
        SystemContextBase,

        {
          provide: APP_GUARD,
          inject: [SystemContextBase, Reflector],
          useFactory: (systemContext: SystemContextBase, reflector: Reflector) =>
            new TenantContextGuard(systemContext, reflector, options?.strictHandlingOfTenantIdHeader),
        },
      ],
      exports: [AsyncContext],
    }
  }
}
