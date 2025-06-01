import { Exception } from "./Exception"
import { HttpStatus } from "@nestjs/common"

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
    public readonly innerError?: Error | unknown,
    public readonly httpStatusCode?: number
  ) {
    super(httpStatusCode ?? HttpStatus.FORBIDDEN, "SecurityException", description, contextData, innerError)
    Object.setPrototypeOf(this, SecurityException.prototype)
  }
}
