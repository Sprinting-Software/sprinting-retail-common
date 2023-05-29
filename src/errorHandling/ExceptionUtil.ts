import { Exception } from "./exceptions/Exception"
import { CustomBadRequestException } from "./exceptions/CustomBadRequestException"
import { BadRequestException } from "@nestjs/common"
import util from "util"
import { IExceptionJson } from "./IExceptionJson"
import { ServerException } from "./exceptions/ServerException"

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

    if (error.name === "BadRequestException") {
      return new CustomBadRequestException(<BadRequestException>error)
    }

    if ("getStatus" in error && typeof error.getStatus === "function") {
      return new Exception(error.getStatus(), error.name, error.message).setInnerError(error)
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
      stackTrace: err.stackTrace,
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
