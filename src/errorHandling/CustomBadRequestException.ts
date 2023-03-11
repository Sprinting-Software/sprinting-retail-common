import { BadRequestException } from "@nestjs/common"
import { AppException } from "./AppException"

export class CustomBadRequestException extends AppException {
  public readonly validationErrors: Record<string, string[]> = {}

  constructor(private readonly badRequestException: BadRequestException) {
    super(400, badRequestException.name, badRequestException.message)

    Object.setPrototypeOf(this, CustomBadRequestException.prototype)
    this.validationErrors = badRequestException.getResponse()["message"]
  }

  override toString(): string {
    const { errorName, httpStatus } = this
    let message = `${errorName} (HTTP_STATUS ${httpStatus})`
    message += ` ERROR_NAME - ${this.errorName}`
    message += ` ERROR_MESSAGE - ${this.description}`
    message += ` VALIDATION_ERRORS - ${JSON.stringify(this.validationErrors)}`

    if (this.validationErrors) message += ` VALIDATION_ERRORS - ${JSON.stringify(this.validationErrors)}`

    return message
  }

  override getResponse() {
    return {
      statusCode: this.httpStatus,
      errorName: this.errorName,
      validationErrors: this.validationErrors,
    }
  }
}
