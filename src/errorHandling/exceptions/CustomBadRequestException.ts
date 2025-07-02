import { BadRequestException } from "@nestjs/common"
import { Exception, ExceptionHttpResponse } from "./Exception"
import { StringUtil } from "../../helpers/StringUtil"

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

    if (this.errors) message += ` VALIDATION_ERRORS - ${StringUtil.stringifySafeWithFallback(this.errors)}`

    return message
  }

  override getResponse() {
    return {
      httpStatus: this.httpStatus,
      errorName: this.errorName,
      message: this.description,
    } as ExceptionHttpResponse
  }
}
