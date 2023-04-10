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
  private _message: string
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
  }

  override toString(): string {
    try {
      let msg = `${this.constructor.name} ${this.toStringPreparedForMessageField()}`
      if (this.stack) msg += `\n ${this.stack.split("\n").slice(1).join("\n")}`
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

  private toStringPreparedForMessageField() {
    const { errorName, httpStatus, description, contextData } = this
    let msg = `${errorName} (HTTP_STATUS ${httpStatus}) (${this.errorTraceId}) `
    if (description) msg += `ERROR_DESCRIPTION - ${description}`
    if (contextData) msg += ` - CONTEXT_DATA: ${util.inspect(contextData, INSPECT_SHOW_HIDDEN, INSPECT_DEPTH)}`
    if (this._message && this._message !== this.errorName) msg += ` - ADDITIONAL_MESSAGE: ${this._message}`
    return msg
  }

  /**
   * In order to make the error print nicely during development, we need to override the message property like this.
   */
  public override get message() {
    return this.toStringPreparedForMessageField()
  }

  public override set message(m: string) {
    this._message = m
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

    return this
  }

  /*
   * Adds additional context data to the response object. Existing context data will be merged with the new data.
   * @param {Record<string, any>} contextData - The context data to be included with the error.
   * @returns {AppException} - The modified AppException object with the enriched context data
   */
  setContextData(contextData: Record<string, any>) {
    this.contextData = contextData
    return this
  }

  /*
   * Sets a description for the error.
   * @param {string} description - The description to be included with the error.
   * @returns {AppException} - The modified AppException object with the description set.
   */
  setDescription(description: string) {
    this.description = description
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
