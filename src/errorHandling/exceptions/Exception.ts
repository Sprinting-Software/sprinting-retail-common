import util from "util"
import { HttpStatus } from "@nestjs/common"

export interface ExceptionHttpResponse {
  httpStatus: number
  errorName: string
  errorTraceId: string
  message?: string
  contextData?: Record<string, any>
  debugMessage?: string | object
  stacktrace?: string
}

const INSPECT_DEPTH = 7
const INSPECT_SHOW_HIDDEN = false
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
    const innerErrorMessage = this.innerError ? `INNER_ERROR: ${this.innerError.message}` : ""
    this.message = `${this.concatAllRelevantInfo()} ${innerErrorMessage}`
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
