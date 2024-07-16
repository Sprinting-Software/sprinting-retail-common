import { Exception } from "./exceptions/Exception"
import { CustomBadRequestException } from "./exceptions/CustomBadRequestException"
import { BadRequestException } from "@nestjs/common"
import util from "util"
import { IExceptionJson } from "./IExceptionJson"
import { ServerException } from "./exceptions/ServerException"
import { SecurityException } from "./exceptions/SecurityException"

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
          error
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

    if (error.name === "BadRequestException") {
      return new CustomBadRequestException(<BadRequestException>error)
    }

    if ("getStatus" in error && typeof error.getStatus === "function") {
      return new Exception(error.getStatus(), error.name, error.message).setInnerError(error)
    }

    // This is to not re-throw Sprinting IDP errors with 500 status
    if ("httpStatus" in error) {
      return new Exception(+error.httpStatus, error.name, error.message).setInnerError(error)
    }

    return new ServerException(error.name, error.message, undefined, error)
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
      ...(err.response.data.error ? err.response.data.error : {}),
      // Not sure which field holds the stack trace
      stackTrace: err.stackTrace,
      stack: err.stack,
    }

    if (context.config.auth) context.config.auth.password = "REDACTED"
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
  return status === 401 || status === 403 || status === 407
}
