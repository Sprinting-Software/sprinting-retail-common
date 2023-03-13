import { HttpStatus } from "@nestjs/common"
import { CommonException } from "./CommonException"

export class NamedException extends CommonException {
  constructor(errorName: string, description?: string, contextData?: Record<string, any>, innerError?: Error | string) {
    super(HttpStatus.BAD_REQUEST, errorName, description, contextData, innerError)
  }
}
