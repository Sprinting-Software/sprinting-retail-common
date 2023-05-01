import { AppExceptionResponse, AppExceptionResponseV2, Exception } from "./Exception"
import { HttpStatus } from "@nestjs/common"
import { LibraryVersioning } from "../../libVersioning/LibraryVersioning"

/**
 * An exception using HTTP status code 403 FORBIDDEN.
 * Exceptions of this type are treated specially in that the context data, stacktrace and description
 * are never returned to the client, not even in non-production.
 * This is to ensure a minimum amount of information leakage.
 */
export class SecurityException extends Exception {
  constructor(
    public readonly description?: string,
    public readonly contextData: Record<string, any> = {},
    public readonly innerError?: Error
  ) {
    super(HttpStatus.FORBIDDEN, "SecurityException", description, contextData, innerError)
    Object.setPrototypeOf(this, SecurityException.prototype)
  }

  /**
   * Make sure details about security errors are never returned to the client.
   */
  override getResponse(): AppExceptionResponse | AppExceptionResponseV2 {
    if (LibraryVersioning.v2IsActive()) {
      return {
        httpStatus: this.httpStatus,
        errorName: this.errorName,
        errorTraceId: this.errorTraceId,
      }
    } else {
      return {
        statusCode: this.httpStatus,
        errorName: this.errorName,
        errorTraceId: this.errorTraceId,
      }
    }
  }
}
