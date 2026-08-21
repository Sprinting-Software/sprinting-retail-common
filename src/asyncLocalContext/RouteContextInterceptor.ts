import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from "@nestjs/common"
import { Observable } from "rxjs"
import { AsyncContext } from "./AsyncContext"
import { RawLogger } from "../logger/RawLogger"

/**
 * Sets requestRoute (the matched route *pattern*, e.g. `/orders/{id}`, as opposed to
 * requestRouteRaw's actual URL) on the async context. Must run as an interceptor, not
 * middleware: Express only populates req.route once its router has matched the request, which
 * happens after middleware but before interceptors -- see TraceContextMiddleware, which runs too
 * early to read it. Registered globally via AsyncContextModule so every consumer gets this for
 * free, without needing app-level wiring.
 */
@Injectable()
export class RouteContextInterceptor implements NestInterceptor {
  constructor(private readonly asyncContext: AsyncContext) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    try {
      const req = context.switchToHttp().getRequest()
      const requestRoute: string | undefined = req?.route?.path
      if (requestRoute) {
        this.asyncContext.initProperty("requestRoute", requestRoute, true)
      }
    } catch (error) {
      // Route capture for logging must never break the actual request.
      RawLogger.error("Error in RouteContextInterceptor", error)
    }
    return next.handle()
  }
}
