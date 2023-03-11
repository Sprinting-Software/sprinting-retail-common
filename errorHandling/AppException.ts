import util from "util"
import { HttpException, HttpStatus } from "@nestjs/common"

interface AppExceptionResponse {
  statusCode: number
  errorName: string
  message?: string
  contextData?: Record<string, any>
  innerError?: Error
}

export class AppException extends HttpException {
  constructor(
    public readonly httpStatus: number = HttpStatus.BAD_REQUEST,
    public readonly errorName: string = "UNKNOWN_HTTP_EXCEPTION",
    public readonly description?: string,
    public contextData?: Record<string, any>,
    public innerError?: Error
  ) {
    super(errorName, httpStatus)
  }

  override toString(): string {
    const { errorName, httpStatus, description, contextData, innerError } = this
    let message = `${errorName} (HTTP_STATUS ${httpStatus})`
    if (description) message += `ERROR_DESCRIPTION - ${description}`
    if (contextData) message += ` - CONTEXT_DATA: ${util.inspect(contextData)}`
    if (innerError) message += ` - INNER_ERROR: ${util.inspect(innerError)}`

    return message
  }

  /**
   * Use this method to add an inner error to the current AppException object.
   * An inner error is an error that caused the current error to occur.
   *
   * @param {Error} innerError - The inner error to add to the AppException object.
   * @returns {AppException} - The modified AppException object with the new inner error.
   */
  addInnerError(innerError: Error): AppException {
    this.innerError = innerError

    return this
  }

  /*
   * Adds additional context data to the response object
   */
  addContextData(contextData: Record<string, any>) {
    this.contextData = contextData

    return this
  }

  /**
   * Returns the response object that will be sent to the client.
   * Please do not change the method name as it matches with the NestJS built-in error interface.
   */
  getResponse(): AppExceptionResponse {
    return {
      statusCode: this.httpStatus,
      errorName: this.errorName,
      message: this.description,
      contextData: this.contextData,
    }
  }
}
