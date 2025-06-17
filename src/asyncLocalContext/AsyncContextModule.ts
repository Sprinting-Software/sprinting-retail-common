import { DynamicModule, Global, MiddlewareConsumer, Module, NestModule } from "@nestjs/common"
import { AsyncContext } from "./AsyncContext"
import { AsyncContextMiddleware } from "./AsyncContextMiddleware"
import { APP_GUARD, Reflector } from "@nestjs/core"
import { setApmLabelCallback, AsyncContextOptions } from "./types"
import { ApmHelper } from "../apm/ApmHelper"
import { TenantContextGuard } from "./TenantContextGuard"
import { TraceContextMiddleware } from "./TraceContextMiddleware"
import { SystemContextBase } from "./SystemContextBase"
import { TraceContext } from "./TraceContext"
import { RawLogger } from "../logger/RawLogger"
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
          try {
            const valueStr = maskIfNeeded(key, value.toString())
            if (key.toLowerCase() === "userid") {
              ApmHelper.Instance.getApmAgent().setUserContext({ id: valueStr })
            }
            if (key.toLowerCase() === "email") {
              ApmHelper.Instance.getApmAgent().setUserContext({ email: valueStr })
            }
            if (key.toLowerCase() === "username") {
              ApmHelper.Instance.getApmAgent().setUserContext({ username: valueStr })
            }
          } catch (e) {
            // Suppress errors in setting APM labels
            RawLogger.error(e)
          }
          ApmHelper.Instance.setLabelOnCurrentTransaction(key, value?.toString())
        }
    return {
      module: AsyncContextModule,
      providers: [
        {
          provide: AsyncContext,
          useFactory: () => new AsyncContext(defaultContext, options, _setApmLabel),
        },
        AsyncContextMiddleware,
        TraceContext,
        SystemContextBase,
        {
          provide: APP_GUARD,
          inject: [SystemContextBase, Reflector],
          useFactory: (systemContext: SystemContextBase, reflector: Reflector) =>
            new TenantContextGuard(systemContext, reflector, options?.strictHandlingOfTenantIdHeader),
        },
      ],
      exports: [AsyncContext, TraceContext],
    }
  }
}

/**
 * Masks or redacts sensitive values based on the key.
 * - Redacts values if the key suggests passwords or secrets.
 * - Masks emails like abc@efgh.com → a*2@e*3.com
 * @param key - The key name (e.g. "userPassword", "emailAddress")
 * @param value - The value to be masked/redacted
 * @returns A masked or redacted string
 */
function maskIfNeeded(key: string, value: string): string {
  const lowerKey = key.toLowerCase()

  if (lowerKey.includes("password") || lowerKey.includes("secret")) {
    return "REDACTED"
  }

  if (lowerKey.includes("email")) {
    const [user, domain] = value.split("@")
    if (!user || !domain) return value

    const userMasked = `${user[0]}*${user.length - 1}`
    const domainParts = domain.split(".")
    const domainMasked =
      domainParts.length > 1
        ? `${domainParts[0][0]}*${domainParts[0].length - 1}.${domainParts.slice(1).join(".")}`
        : domain

    return `${userMasked}@${domainMasked}`
  }

  return value
}
