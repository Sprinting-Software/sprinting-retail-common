import { Exception, ExceptionHttpResponse } from "./exceptions/Exception"
import { CustomBadRequestException } from "./exceptions/CustomBadRequestException"
import { BadRequestException, HttpException } from "@nestjs/common"
import util from "util"
import { IExceptionJson } from "./IExceptionJson"
import { ServerException } from "./exceptions/ServerException"
import { SecurityException } from "./exceptions/SecurityException"
import { Http } from "winston/lib/winston/transports"

const ERROR_TRACE_ID_FIELD = "errorTraceId"

export type ErrorDetailsForApmLogging = {
  errorName: string
  errorTraceId: string
  contextData: Record<string, any>
  stacktrace: string
}
export class ExceptionUtil {
  static parseErrorDetailsForApmLogging(exception: Exception | HttpException): ErrorDetailsForApmLogging {
    if (exception instanceof Exception) {
      return {
        contextData: exception.contextData,
        errorName: exception.errorName,
        errorTraceId: exception.errorTraceId,
        stacktrace: exception.generatePrettyStacktrace(),
      }
    } else {
      return {
        contextData: exception["contextData"],
        errorName: exception.name,
        errorTraceId: exception[ERROR_TRACE_ID_FIELD],
        stacktrace: exception.stack,
      }
    }
  }
  static getHttpJsonResponseFromError(
    exception: Exception | HttpException,
    hideErrorDetailsInHttpResponse: boolean
  ): any {
    if (exception instanceof Exception) {
      return exception.getResponse(hideErrorDetailsInHttpResponse)
    } else {
      const httpException = exception as HttpException
      return ExceptionUtil.getHttpResponseFromNestHttpException(httpException)
    }
  }
  /**
   * Assigns context data to an error object of any kind.
   * @param exception
   * @param contextData
   */
  static assignContextData(exception: any, contextData: Record<string, any>) {
    if (exception.contextData === undefined) {
      exception.contextData = {}
    }
    Object.assign(exception.contextData, contextData)
  }

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
          nestError.response.error
            ? `${nestError.constructor.name}: ${nestError.response.message} - ${nestError.response.error}`
            : `${nestError.constructor.name}: ${nestError.response.message}`,
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
    return new ServerException(error.name, error.message, undefined, error)
  }

  /**
   * A new version of the parse function that tries to simplify things working in this way:
   * Returns the error as is if it is already instanceof Exception.
   * If Axios error, return a parsed axios error.
   * If HttpException from Nest, return the error as-is but enriched with an errorTraceId.
   * Otherwise returns ServerException with the error as inner error.
   * @param error
   * @returns
   */
  public static parseV2(error: Error): Exception | HttpException {
    if (error instanceof Exception) {
      return error
    }
    if (ExceptionUtil.isAxiosError(error)) {
      return ExceptionUtil.parseAxiosError(error)
    }
    if (error instanceof HttpException) {
      error[ERROR_TRACE_ID_FIELD] = Exception.generateErrorTraceId()
      return error
    }
    return new ServerException(error.name, error.message, undefined, error)
  }

  public static getHttpResponseFromNestHttpException(httpException: HttpException): ExceptionHttpResponse {
    return {
      httpStatus: httpException.getStatus(),
      errorName: httpException.name,
      message: httpException.message,
      errorTraceId: httpException[ERROR_TRACE_ID_FIELD],
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
  return "response" in error && "statusCode" in error.response && "message" in error.response && "status" in error
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
