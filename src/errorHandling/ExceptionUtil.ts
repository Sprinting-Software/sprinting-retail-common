import { Exception } from "./exceptions/Exception"
import { CustomBadRequestException } from "./exceptions/CustomBadRequestException"
import { BadRequestException } from "@nestjs/common"
import util from "util"
import { IExceptionJson } from "./IExceptionJson"
import { ServerException } from "./exceptions/ServerException"
import { SecurityException } from "./exceptions/SecurityException"
import { RawLogger } from "../logger/RawLogger"

export class ExceptionUtil {
  /**
   * Parses an error and returns an AppException.
   * @param error
   */
  public static parse(error: Error): Exception {
    if (error instanceof Exception) {
      return error
    }

    if (ExceptionUtil.isAxiosError(error)) {
      return ExceptionUtil.parseAxiosError(error)
    }

    if (isNestHttpException(error)) {
      const nestError = error as unknown as NestHttpException
      if (isSecurityRelatedHttpStatusCode(nestError.status)) {
        return new SecurityException(
          `${nestError.constructor.name}: ${nestError.response.message} - ${nestError.response.error}`,
          nestError.option,
          error,
          nestError.status
        )
      } else {
        return new Exception(
          nestError.status,
          nestError.constructor.name,
          nestError.response.message,
          nestError.option,
          error
        )
      }
    }

    // This special case should be removed at some point.
    if (error.name === "BadRequestException") {
      return new CustomBadRequestException(<BadRequestException>error)
    }

    return ExceptionUtil.parseGenericErrorUtil(error)
  }

  /**
   * This function will properly parse any kind of Error or Object and properly
   * wrap it into an Exception. It will also try to extract as much information
   * and context data and stack information as possible from the original error.
   * Finally, the original error will be discarded to avoid duplicate information.
   * If one really needs to see the original error, you can enable raw logging
   * via setting of an environment variable DEBUG_ERROR_HANDLING=true.
   * @param origError
   * @returns
   */
  private static parseGenericErrorUtil(origError: any): Exception {
    RawLogger.debug("Original error", { origError, type: typeof origError, constructor: origError.constructor.name })
    if (origError.constructor === Object || origError.constructor === Error || typeof origError === "object") {
      const contextDataExtra = {}
      let errorName = origError.name || origError.errorName
      const constructorName = origError.constructor.name
      if (origError.constructor !== Object && origError.constructor !== Error && origError.constructor !== String) {
        // Constructor may be significant information
        if (!errorName) {
          errorName = origError.constructor.name
        } else {
          contextDataExtra["innerErrorConstructor"] = constructorName
        }
      }
      const httpStatus = getStatusFrom(origError) || 500
      delete origError.httpStatus
      const message = origError.message || ""
      justTry(() => delete origError.message)
      const contextData = { ...contextDataExtra }
      // Pass all properties of the inner error to the context data
      for (const key of Object.keys(origError)) {
        contextData[key] = origError[key]
        justTry(() => delete origError[key])
      }
      const wrappedError = new Exception(httpStatus, errorName, message, contextData, origError)
      wrappedError.setStacktraceFromAnotherError(origError)
      RawLogger.debug("Wrapped error", { wrappedError })
      return wrappedError
    } else {
      return new Exception(500, "UnknownError").setInnerError(origError)
    }
  }

  /**
   * Is used to protect logging from overflow in case of axios errors.
   * This function picks the right stuff from axios errors.
   * @param err
   */
  public static parseAxiosError(err) {
    const context = {
      config: err.config,
      status: err.response.status,
      statusText: err.response.statusText,
      ...(err.response?.data?.error &&
        (typeof err.response.data.error === "object" ? err.response.data.error : { message: err.response.data.error })),
      // Not sure which field holds the stack trace
      stackTrace: err.stackTrace,
      stack: err.stack,
    }

    if (context.config?.auth) {
      if (context.config.auth.username) {
        context.config.auth.username = maskString(context.config.auth.username)
      }
      context.config.auth.password = "REDACTED"
    }
    return new ServerException("AxiosError").setContextData(context)
  }

  /**
   * Determines whether an error is an axios error using some heuristic criteria that we believe are sufficient.
   * @param err
   */
  public static isAxiosError(err) {
    return err.config && err.response && err.response.data
  }

  /*
  Sometimes it is useful to convert an Error to a plain json structure, for instance when you want to do snapshot-testing
  in which case it is not working for real error objects.
   */
  public static toPlainJsonForSpec(error: unknown) {
    return this.toPlainJson(error, true)
  }

  private static toPlainJson(error: unknown, redactTraceFields = false): IExceptionJson {
    if (!error) return { errorName: "UndefinedError", description: `Found this error: ${util.inspect(error)}` }

    if (error instanceof Exception) {
      const exc = {
        errorName: error.errorName,
        description: error.description,
        contextData: error.contextData,
        httpStatus: error.httpStatus,
        errorTraceId: redactTraceFields ? "REDACTED" : error.errorTraceId,
      } as IExceptionJson
      if (error.innerError) exc.innerError = this.toPlainJson(error.innerError, redactTraceFields)
      return exc as IExceptionJson
    }
    if (error instanceof Error) return { errorName: error.name, description: error.message }
    return { errorName: "UnknownError", description: `Found this error: ${util.inspect(error)}` }
  }
}
/**
 * Determines whether an error is of type NestHttpException. As we don't want a
 * direct dependency on the NestHttpException type, we use this approach to check
 * against the properties we expect from a NestHttpException.
 * @param error
 */
function isNestHttpException(error: any) {
  // Check if the error has all the properties of a NestHttpException
  return (
    "response" in error &&
    typeof error.response === "object" &&
    "statusCode" in error.response &&
    "message" in error.response &&
    "status" in error
  )
}

type NestHttpException = {
  response: {
    statusCode: number
    message: string
    error?: string
  }
  status: number
  option?: Record<string, string>
}
function isSecurityRelatedHttpStatusCode(status: number) {
  return status === 403 || status === 407
}

function maskString(input?: string) {
  if (!input?.length) {
    return input
  }

  const stars = "*".repeat(input.length > 4 ? Math.max(3, input.length - 4) : 0)

  return `${input.slice(0, Math.floor((input.length - stars.length) / 2))}${stars}${input.slice(
    Math.floor((stars.length - input.length) / 2)
  )}`
}

/*Convenience function to try to execute a function and ignore any exceptions that might be thrown.*/
function justTry(action: () => void) {
  try {
    action()
  } catch (e) {
    // ignore
  }
}
function getStatusFrom(origError: any): number {
  if (origError.httpStatus || origError.status) {
    return parseInt(origError.httpStatus || origError.status)
  } else {
    if (origError.getStatus && typeof origError.getStatus === "function") {
      return parseInt(origError.getStatus())
    }
  }
  return undefined
}
