import util from "util"
import { HttpStatus } from "@nestjs/common"
import { inspect } from "util"

export interface ExceptionHttpResponse {
  httpStatus: number
  errorName: string
  errorTraceId: string
  message?: string
  contextData?: Record<string, any>
  debugMessage?: string | object
  stacktrace?: string
}

const INSPECT_DEPTH = 3
const INSPECT_SHOW_HIDDEN = true
const MSG_LENGTH = 8445 // Max message length for UDP

export class Exception extends Error {
  public readonly errorTraceId: string

  constructor(
    public readonly httpStatus: number = HttpStatus.BAD_REQUEST,
    public errorName: string,
    public description?: string,
    public contextData: Record<string, any> = {},
    public innerError?: Error
  ) {
    super(errorName ?? HttpStatus[httpStatus])
    this.errorName = errorName ?? HttpStatus[httpStatus]
    this.errorTraceId = Exception.generateErrorTraceId()
    this.refreshMessageField()
    Object.setPrototypeOf(this, Exception.prototype)
    this.updateStacktrace()
  }

  /**
   * We need this to preserve the original stack trace in ELK when errors are wrapped to get proper error reporting.
   * @private
   */
  private updateStacktrace() {
    if (this.innerError) {
      this.stack = this.innerError.stack
    }
  }

  public getStatus(): number {
    return this.httpStatus
  }
  override toString(): string {
    return this.toStringHelper()
  }

  private toStringHelper(includeStackTrace = true) {
    try {
      let msg = this.message
      if (this.stack && includeStackTrace) msg += `\n ${this.generatePrettyStacktrace()}`
      if (msg.length > MSG_LENGTH) {
        return `${msg.substring(0, MSG_LENGTH)}...TRUNCATED`
      }
      return msg
    } catch (e) {
      return "ERROR_IN_TO_STRING"
    }
  }

  public generatePrettyStacktrace(): string {
    try {
      return this.stack?.split("\n").slice(1).join("\n")
    } catch (e) {
      return "STACKTRACE_GENERATION_FAILED"
    }
  }

  /**
   * Used to generate a string that can be used as a message field in ELK and in console output
   * @private
   */
  private concatAllRelevantInfo() {
    const { errorName, httpStatus, description, contextData } = this
    let msg = `${this.constructor.name}(ERROR_NAME: ${errorName} | HTTP_STATUS: ${httpStatus} | ERR_ID: ${this.errorTraceId}`
    if (description) msg += ` | ERROR_DESCRIPTION: ${description}`
    if (contextData) msg += ` | CONTEXT_DATA: ${util.inspect(contextData, INSPECT_SHOW_HIDDEN, INSPECT_DEPTH)})`
    return msg
  }

  /**
   * This method will determine the content of the error.exception.message field in ELK.
   * This field is indexed and searchable.
   * We need to refresh the message field because we have to support the fluent API
   * where not all fields are necessarily passed in the constructor.
   * @private
   */
  private refreshMessageField() {
    const innerErrorMessage = this.innerError ? `INNER_ERROR: ${Exception.FormatError(this.innerError)}` : ""
    this.message = `${this.concatAllRelevantInfo()} ${innerErrorMessage}`
  }
  static FormatError(innerError: any) {
    if (innerError instanceof Exception) {
      return (innerError as Exception).concatAllRelevantInfo()
    } else {
      // take all string fields of innerError and concat
      return inspect(convertErrorToObjectForLogging(innerError, 0), INSPECT_SHOW_HIDDEN, INSPECT_DEPTH)
    }
  }

  /**
   * Use this method to add an inner error to the current AppException object.
   * An inner error is an error that caused the current error to occur.
   *
   * @param {Error} innerError - The inner error to add to the AppException object.
   * @returns {Exception} - The modified AppException object with the new inner error.
   */
  setInnerError(innerError: Error): Exception {
    this.innerError = innerError
    this.refreshMessageField()
    this.updateStacktrace()
    return this
  }

  /*
   * Adds additional context data to the response object. Existing context data will be merged with the new data.
   * @param {Record<string, any>} contextData - The context data to be included with the error.
   * @returns {AppException} - The modified AppException object with the enriched context data
   */
  setContextData(contextData: Record<string, any>) {
    this.contextData = { ...this.contextData, ...contextData }
    this.refreshMessageField()
    return this
  }

  /**
   * Returns the response object that will be sent to the client.
   * Please do not change the method name as it matches with the NestJS built-in error interface.
   */
  getResponse(hideErrorDetails: boolean): ExceptionHttpResponse {
    const obj: any = {
      httpStatus: this.httpStatus,
      errorName: this.errorName,
      errorTraceId: this.errorTraceId,
      message: this.description,
      contextData: this.contextData,
    }
    if (!hideErrorDetails) {
      obj.debugMessage = this.message
      obj.stacktrace = this.generatePrettyStacktrace()
    } else {
      obj.note = "Error details can be looked up elsewhere using the errorTraceId!"
    }
    return obj
  }

  /**
   * Generates a random string that can be used as an error trace id.
   * Should only contain upper case letters that cannot be confused with numbers.
   * @private
   */
  private static generateErrorTraceId() {
    const result = new Array(6)
    function getRandom(cs: string = CHARS) {
      return cs.charAt(Math.floor(Math.random() * cs.length))
    }
    for (let i = 0; i < 6; i++) {
      result[i] = getRandom(CHARS)
    }
    return `ERR${result.join("")}`
  }
}
const CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
/**
 * Converts an error to an object that can be safely logged
 * without risking circular references, very large objects or similar.
 * Alto the stack trace should be removed.
 * It runs through all properties recursively and converts them to strings.
 * @param innerError
 */
export function convertErrorToObjectForLogging(innerError: any, depth: number, visited: Set<any> = new Set()): any {
  if (depth > 3) {
    return "MAX_DEPTH_REACHED"
  }

  // Check if we've already visited this object
  if (visited.has(innerError)) {
    return undefined
  }

  // Add the current object to the visited set
  visited.add(innerError)

  const result: any = {}
  const propertyNames = Object.getOwnPropertyNames(innerError)

  propertyNames.forEach((key) => {
    if (typeof innerError[key] === "function") {
      // Skip functions
    } else if (innerError[key] instanceof Error) {
      const convertedError = convertErrorToObjectForLogging(innerError[key], depth + 1, visited)
      if (convertedError !== undefined) {
        result[key] = convertedError
      }
    } else if (typeof innerError[key] === "object" && innerError[key] !== null) {
      const convertedObject = convertErrorToObjectForLogging(innerError[key], depth + 1, visited)
      if (convertedObject !== undefined) {
        result[key] = convertedObject
      }
    } else {
      if (key === "stack" || key.toLowerCase() === "stacktrace") {
        // remove stack trace
      } else {
        try {
          // eslint-disable-next-line prefer-template
          result[key] = innerError[key] && innerError[key].toString ? innerError[key].toString() : innerError[key] + ""
        } catch (e) {
          result[key] = "IMPOSSIBLE TO SERIALIZE VALUE"
        }
      }
    }
  })

  // Remove the current object from the visited set before returning
  visited.delete(innerError)

  return result
}
