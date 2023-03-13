import { HttpStatus } from "@nestjs/common"
import { CommonException } from "./CommonException"

export class NamedException500 extends CommonException {
  constructor(errorName: string, description?: string, contextData?: Record<string, any>, innerError?: Error | string) {
    super(HttpStatus.BAD_GATEWAY, errorName, description, contextData, innerError)
  }
}
