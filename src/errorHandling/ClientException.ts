import { AppException } from "./AppException"
import { HttpStatus } from "@nestjs/common"

/**
 * An exception using HTTP status code 500 InternalServerError.
 */
export class ClientException extends AppException {
  constructor(
    public readonly errorName: string,
    public readonly description?: string,
    public readonly contextData?: Record<string, any>,
    public readonly innerError?: Error
  ) {
    super(HttpStatus.BAD_REQUEST, errorName, description, contextData, innerError)
    Object.setPrototypeOf(this, ClientException.prototype)
  }
}
