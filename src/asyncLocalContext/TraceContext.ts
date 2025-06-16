import { Global, Injectable } from "@nestjs/common"
import { AsyncContext } from "./AsyncContext"
import { ServerException } from "../errorHandling/exceptions/ServerException"
import { RawLogger } from "../logger/RawLogger"

@Global()
@Injectable()
/**
 * A thin wrapper around AsyncContext providing the ability to add trace context.
 */
export class TraceContext {
  constructor(private readonly asyncContext: AsyncContext) {}

  public addTraceContext(propertyName: string, value: string | number | boolean | undefined): void {
    const val = this.asyncContext.getPropertyOrUndefined(propertyName)
    if (val !== undefined && val !== value) {
      RawLogger.error(
        new ServerException("TraceContextAlreadyDefinedWithAnotherValue", undefined, {
          propertyName,
          newValue: value,
          existingValue: val,
        })
      )
    } else {
      this.asyncContext.initProperty(propertyName, value)
    }
  }
}
