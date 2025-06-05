import { Injectable, NestMiddleware } from "@nestjs/common"
import { AsyncContext } from "./AsyncContext"
import { NextFunction, Request, Response } from "express"

/**
 * Sets up the initial blank async context.
 * Other interceptors and middleware can then enrich this context with additional properties.
 */
@Injectable()
export class AsyncContextMiddleware implements NestMiddleware {
  constructor(private readonly applicationContext: AsyncContext) {}

  use(req: Request, res: Response, next: NextFunction): void {
    const blankContext = {}
    this.applicationContext.runWithContextSync(blankContext, () => {
      try {
        next()
      } catch (err) {
        next(err)
      }
    })
  }
}
