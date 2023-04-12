import { AppException } from "./exceptions/AppException"
import { CustomBadRequestException } from "./exceptions/CustomBadRequestException"
import { BadRequestException } from "@nestjs/common"

export class ErrorParser {
  /**
   * Parses an error and returns an AppException.
   * @param error
   */
  public static parse(error: Error): AppException {
    if (error instanceof AppException) {
      return error
    }

    if (error.name === "BadRequestException") {
      return new CustomBadRequestException(<BadRequestException>error)
    }

    if ("getStatus" in error && typeof error.getStatus === "function") {
      return new AppException(error.getStatus(), error.name, error.message).setInnerError(error)
    }

    return new AppException(500, error.name, error.message, undefined, error)
  }
}
