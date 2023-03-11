import { HttpStatus } from "@nestjs/common"
import { CommonException } from "./CommonException"

export class CommonHttpException extends CommonException {
  constructor(
    httpStatus: HttpStatus,
    description?: string,
    contextData?: Record<string, any>,
    innerError?: Error | string
  ) {
    super(httpStatus, HttpStatus[httpStatus], description, contextData, innerError)
  }
}
