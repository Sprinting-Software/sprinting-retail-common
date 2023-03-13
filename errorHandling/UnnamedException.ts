import { HttpStatus } from "@nestjs/common"
import { CommonHttpException } from "./CommonHttpException"

export class UnnamedException extends CommonHttpException {
  constructor(description?: string, contextData?: Record<string, any>, innerError?: Error | string) {
    super(HttpStatus.INTERNAL_SERVER_ERROR, description, contextData, innerError)
  }
}
