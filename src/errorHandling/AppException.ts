import util from "util"
import { HttpException, HttpStatus } from "@nestjs/common"
import { LibraryVersioning } from "../libVersioning/LibraryVersioning"

export interface AppExceptionResponse {
  statusCode: number
  errorName: string
  errorTraceId: string
  message?: string | object
  contextData?: Record<string, any>
  innerError?: Error
}
export interface AppExceptionResponseV2 {
  httpStatus: number
  errorName: string
  errorTraceId: string
  message?: string | object
  contextData?: Record<string, any>
  innerError?: Error
}

const INSPECT_DEPTH = 7
const INSPECT_SHOW_HIDDEN = false

export class AppException extends HttpException {
  public readonly errorTraceId: string
  constructor(
    public readonly httpStatus: number = HttpStatus.BAD_REQUEST,
    public errorName: string,
    public description?: string,
    public contextData?: Record<string, any>,
    public innerError?: Error
  ) {
    super(errorName ?? HttpStatus[httpStatus], httpStatus)
    this.errorName = errorName ?? HttpStatus[httpStatus]
    this.errorTraceId = AppException.generateErrorTraceId()
    this.refreshMessageField()
  }

  override toString(): string {
    try {
      let msg = `${this.constructor.name} ${this.concatAllRelevantInfo()}`
      if (this.stack) msg += `\n ${this.generateStacktrace()}`
      if (this.innerError) {
        msg += "\nINNER_ERROR:\n"
        if (this.innerError instanceof AppException) {
          msg += this.innerError.toString()
        } else {
          const e0 = util.inspect(this.innerError)
          msg += e0
        }
      }
      return msg
    } catch (e) {
      return "ERROR_IN_TO_STRING"
    }
  }

  public generateStacktrace(): string {
    try {
      const lines = this.stack.split("\n").slice(1)
      const lines2 = lines.map((line) => {
        return this.truncateStackLine(line, ["/src/", "/node_modules/"])
      })
      return lines2.join("\n")
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error(e)
      return "STACKTRACE_GENERATION_FAILED"
    }
  }

  private truncateStackLine(line, tokens: string[]) {
    let result
    tokens.forEach((tok: string) => {
      if (line.indexOf(tok) > -1) {
        result = `.${line.substring(line.indexOf(tok))}`
      }
    })
    if (result) {
      return result.replace(")", "")
    } else {
      return line
    }
  }

  /**
   * Used to generate a string that can be used as a message field in ELK and in console output
   * @private
   */
  private concatAllRelevantInfo() {
    const { errorName, httpStatus, description, contextData } = this
    let msg = `${errorName} (HTTP_STATUS ${httpStatus}) (${this.errorTraceId}) `
    if (description) msg += `ERROR_DESCRIPTION - ${description}`
    if (contextData) msg += ` - CONTEXT_DATA: ${util.inspect(contextData, INSPECT_SHOW_HIDDEN, INSPECT_DEPTH)}`
    return msg
  }

  /**
   * We need to refresh the message field because we have to support the fluent API
   * where not all fields are necessarily passed in the constructor.
   * @private
   */
  private refreshMessageField() {
    this.message = this.concatAllRelevantInfo()
  }

  /**
   * Use this method to add an inner error to the current AppException object.
   * An inner error is an error that caused the current error to occur.
   *
   * @param {Error} innerError - The inner error to add to the AppException object.
   * @returns {AppException} - The modified AppException object with the new inner error.
   */
  setInnerError(innerError: Error): AppException {
    this.innerError = innerError
    this.refreshMessageField()
    return this
  }

  /*
   * Adds additional context data to the response object. Existing context data will be merged with the new data.
   * @param {Record<string, any>} contextData - The context data to be included with the error.
   * @returns {AppException} - The modified AppException object with the enriched context data
   */
  setContextData(contextData: Record<string, any>) {
    this.contextData = contextData
    this.refreshMessageField()
    return this
  }

  /*
   * Sets a description for the error.
   * @param {string} description - The description to be included with the error.
   * @returns {AppException} - The modified AppException object with the description set.
   */
  setDescription(description: string) {
    this.description = description
    this.refreshMessageField()
    return this
  }

  /**
   * Returns the response object that will be sent to the client.
   * Please do not change the method name as it matches with the NestJS built-in error interface.
   */
  getResponse(): AppExceptionResponse | AppExceptionResponseV2 {
    if (LibraryVersioning.v2IsActive()) {
      return {
        httpStatus: this.httpStatus,
        errorName: this.errorName,
        message: this.description,
        contextData: this.contextData,
        errorTraceId: this.errorTraceId,
      }
    } else {
      return {
        statusCode: this.httpStatus,
        errorName: this.errorName,
        message: this.description,
        contextData: this.contextData,
        errorTraceId: this.errorTraceId,
      }
    }
  }

  /**
   * Generates a random string that can be used as an error trace id.
   * Should only contain upper case letters that cannot be confused with numbers.
   * @private
   */
  private static generateErrorTraceId() {
    const charsAndNumber = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
    const result = new Array(6)
    function getRandom(cs: string = charsAndNumber) {
      return cs.charAt(Math.floor(Math.random() * cs.length))
    }
    for (let i = 0; i < 6; i++) {
      result[i] = getRandom(charsAndNumber)
    }
    return `ERR${result.join("")}`
  }
}
