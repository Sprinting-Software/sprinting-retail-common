import { BadRequestException } from "@nestjs/common"
import { Exception, AppExceptionResponse, AppExceptionResponseV2 } from "./Exception"
import { LibraryVersioning } from "../../libVersioning/LibraryVersioning"

export class CustomBadRequestException extends Exception {
  public readonly errors: Record<string, string[]> = {}

  constructor(private readonly badRequestException: BadRequestException) {
    super(400, badRequestException.name, badRequestException.message)

    Object.setPrototypeOf(this, CustomBadRequestException.prototype)
    this.errors = badRequestException.getResponse()["message"]
  }

  override toString(): string {
    const { errorName, httpStatus } = this
    let message = `${errorName} (HTTP_STATUS ${httpStatus})`
    message += ` ERROR_NAME - ${this.errorName}`
    message += ` ERROR_MESSAGE - ${this.description}`

    if (this.errors) message += ` VALIDATION_ERRORS - ${JSON.stringify(this.errors)}`

    return message
  }

  override getResponse() {
    if (LibraryVersioning.v2IsActive()) {
      return {
        httpStatus: this.httpStatus,
        errorName: this.errorName,
        message: this.errors,
      } as AppExceptionResponseV2
    } else {
      return {
        statusCode: this.httpStatus,
        errorName: this.errorName,
        message: this.errors,
      } as AppExceptionResponse
    }
  }
}
