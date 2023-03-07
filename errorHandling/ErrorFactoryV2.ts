import { HttpStatus } from "@nestjs/common"
import util from "util"
import { CommonException } from "./CommonException"

/**
 * A factory class to product exception objects
 */
export class ErrorFactoryV2 {
  /**
   * A named error has a name and is intended to be either caught and
   * handled somewhere else in the code - other than global error handlers.
   *
   */
  static createNamedException(
    errorName: string,
    description?: string,
    contextData?: Record<string, any>,
    innerError?: Error | string
  ): CommonException {
    return new CommonException(HttpStatus.BAD_REQUEST, errorName, contextData, description, innerError)
  }

  static createUnnamedException(
    description?: string,
    contextData?: Record<string, any>,
    innerError?: Error | string
  ): CommonException {
    const TECHNICAL_ERROR = "TechnicalError"
    return new CommonException(HttpStatus.BAD_REQUEST, TECHNICAL_ERROR, contextData, description, innerError)
  }

  static createHttpException(
    httpStatus: HttpStatus,
    description?: string,
    contextData?: Record<string, any>,
    innerError?: Error | string
  ): CommonException {
    const httpStatusName = HttpStatus[httpStatus]
    const UNKNOWN_HTTP_ERROR = "UKNOWN HTTP ERROR"
    return new CommonException(httpStatus, httpStatusName ?? UNKNOWN_HTTP_ERROR, contextData, description, innerError)
  }

  /**
   * Parses any kind of error to return a proper error object.
   * @param error Any kind of object
   * @returns CommonException object
   */
  static parseAnyError(error: any): CommonException {
    if (error instanceof CommonException) {
      return error
    } else if (error instanceof Error) {
      return this.createUnnamedException().setInnerError(error)
    } else if (typeof error === "string") {
      return this.createUnnamedException(undefined, undefined, `An error of type string was thrown: ${error}`)
    } else {
      return this.createUnnamedException(
        undefined,
        undefined,
        `An error of unknown kind was thrown: ${util.inspect(error)}`
      )
    }
  }
}

export function error2string(error?: any): string | undefined {
  if (!error) {
    return undefined
  }

  if (error instanceof CommonException) {
    return error.toString()
  }

  const errorObject = {
    httpStatus: error.httpStatus,
    errorName: error.errorName,
    errorData: error.contextData,
    description: error.description,
    innerError: error2string(error.innerError),
  }

  return JSON.stringify(errorObject)
}
