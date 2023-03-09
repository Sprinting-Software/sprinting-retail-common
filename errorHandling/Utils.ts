import { CommonException } from "./CommonException"
import { HttpStatus } from "@nestjs/common"

export function error2string(error?: any): string | undefined {
  if (!error) {
    return undefined
  }

  if (error instanceof CommonException) {
    return error.toString()
  }

  const errorObject = {
    httpStatus: HttpStatus.BAD_GATEWAY,
    errorName: error.constructor.name,
    description: error.message,
  }
  if (error.innerError) {
    errorObject["innerError"] = error2string(error.innerError)
  }

  return JSON.stringify(errorObject)
}
