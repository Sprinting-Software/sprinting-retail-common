import { CommonException } from "./CommonException"

export function error2string(error?: any): string | undefined {
  if (!error) {
    return undefined
  }

  if (error instanceof CommonException) {
    return error.toString()
  }

  const errorObject = {
    httpStatus: error.httpStatus,
    errorName: error.errorName,
    errorData: error.contextData,
    description: error.description,
    innerError: error2string(error.innerError),
  }

  return JSON.stringify(errorObject)
}
