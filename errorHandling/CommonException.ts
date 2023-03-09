import util from "util"
import { IExceptionAsHttpResponse } from "./IExceptionAsHttpResponse"
import { error2string } from "./Utils"

interface ICommonException {
  httpStatus: number
  errorName: string
  contextData?: Record<string, any>
  description?: string
  innerError?: any
  toJson: () => IExceptionAsHttpResponse
}

/**
 * An exception class that is used to wrap errors.
 * It is not exported as all construction of instances
 * should go via ErrorFactoryV2
 */
export class CommonException extends Error implements ICommonException {
  constructor(
    public readonly httpStatus: number,
    public readonly errorName: string,
    public readonly contextData: Record<string, any> = {},
    public description?: string,
    public innerError?: any
  ) {
    super(errorName)
  }

  /**
   *
   * @returns a verbose string-version of the error including all messages, names,
   * http status codes and the same for inner errors.
   */
  public toPrintFriendlyString() {
    const { errorName, httpStatus, description, contextData, innerError } = this
    let message = `${errorName} (HTTP_STATUS ${httpStatus})`
    if (description) message += ` - ${description}`
    if (contextData && Object.keys(contextData).length > 0) message += ` - CONTEXT_DATA: ${util.inspect(contextData)}`
    if (innerError) message += ` - INNER_ERROR: ${error2string(innerError)}`

    return message
  }

  override toString(): string {
    return this.toPrintFriendlyString()
  }

  /**
   *
   * @param contextData the context data to include in the error.
   */
  addContextData(contextData: Record<string, any>): CommonException {
    Object.assign(this.contextData, contextData)
    return this
  }

  setInnerError(innerError: any): CommonException {
    this.innerError = innerError
    return this
  }

  setDescription(description: string): CommonException {
    this.description = description
    return this
  }

  toJson(): IExceptionAsHttpResponse {
    const result: IExceptionAsHttpResponse = {
      errorName: this.errorName,
      description: this.description,
      contextData: this.contextData,
    }
    if (this.innerError) result.innerError = error2string(this.innerError)
    return result
  }
}
