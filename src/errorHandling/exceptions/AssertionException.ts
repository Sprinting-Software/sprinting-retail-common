import { Exception } from "./Exception"
import { HttpStatus } from "@nestjs/common"

/**
 * An exception using HTTP status code 500 BAD_GATEWAY.
 * Exceptions of this type are treated specially in that the context data, stacktrace and description
 * are never returned to the client, not even in non-production.
 * This is to ensure a minimum amount of information leakage.
 */
export class AssertionException extends Exception {
  constructor(
    public readonly description?: string,
    public readonly contextData: Record<string, any> = {},
    public readonly innerError?: Error
  ) {
    super(HttpStatus.BAD_GATEWAY, "AssertionException", description, contextData, innerError)
    Object.setPrototypeOf(this, AssertionException.prototype)
  }
}
