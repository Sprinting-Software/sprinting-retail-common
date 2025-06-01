import util from "util"
import { HttpStatus } from "@nestjs/common"
import { inspect } from "util"
import { ExceptionConst } from "./ExceptionConst"

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

export class Exception extends Error {
  public readonly errorTraceId: string

  constructor(
    public readonly httpStatus: number = HttpStatus.BAD_REQUEST,
    public errorName: string,
    public description?: string,
    public contextData: Record<string, any> = {},
    public innerError?: Error | unknown,
    public debugData: Record<string, any> = {}
  ) {
    super(errorName ?? HttpStatus[httpStatus])
    this.errorName = errorName ?? HttpStatus[httpStatus]
    this.errorTraceId = Exception.generateErrorTraceId()
    this.refreshMessageField()
    Object.setPrototypeOf(this, Exception.prototype)
    this.setStacktraceFromAnotherError(innerError)
  }

  /**
   * We need this to preserve the original stack trace in ELK when errors are wrapped to get proper error reporting.
   * @private
   */
  public setStacktraceFromAnotherError(error: unknown) {
    if (error instanceof Error) {
      this.stack = error.stack
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
      const limit = ExceptionConst.getTruncationLimitForExceptions()
      if (msg.length > limit && limit !== -1) {
        return `${msg.substring(0, limit)}...TRUNCATED`
      }
      return msg
    } catch (e) {
      return "ERROR_IN_TO_STRING"
    }
  }

  public generatePrettyStacktrace(makeCompact = true): string {
    if (makeCompact) {
      return this.generatePrettyStacktraceCompactUtil()
    } else {
      try {
        return this.stack?.split("\n").slice(1).join("\n")
      } catch (e) {
        // eslint-disable-next-line no-console
        console.error("STACKTRACE_GENERATION_FAILED: ", e)
        return "STACKTRACE_GENERATION_FAILED"
      }
    }
  }

  private generatePrettyStacktraceCompactUtil(): string {
    try {
      if (!this.stack) return "No stack trace available"

      const stackLines = this.stack.split("\n").slice(1) // Skip the first line (error message)

      //const srcPath = "./src/"
      //const nodeModulesPath = "./node_modules/"
      let externalCount = 0
      const maxExternalLines = 3

      const prettifiedStack = stackLines.map((line) => {
        // Extract the path from the stack trace line
        const match = line.match(/\((.*?):\d+:\d+\)|at (\/.*?):\d+:\d+/)
        const filePath = match ? match[1] : null

        if (!filePath) {
          // 2025-01 It produces cleaner stack traces if we drop this.
          // If no valid file path is found, drop it
          return null // line
        }

        // Make paths relative to `src` or `node_modules`, if applicable
        // 2025-02: We are not cutting down the lines anymore, as it makes the developer experience worse (you cannot easily navigate the links)
        if (filePath.includes("/node_modules/")) {
          return line // line.replace(filePath, `${nodeModulesPath}${filePath.split("/node_modules/")[1]}`)
        } else if (filePath.includes("/src/")) {
          return line // line.replace(filePath, `${srcPath}${filePath.split("/src/")[1]}`)
        } else {
          // Count and replace lines beyond the max allowed for external code
          externalCount++
          return externalCount > maxExternalLines ? null : line
        }
      })

      // Filter out and summarize the skipped lines
      const filteredStack = prettifiedStack.filter(Boolean)
      if (externalCount > maxExternalLines) {
        filteredStack.push(`...${externalCount - maxExternalLines} more lines...`)
      }

      return filteredStack.join("\n")
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error("STACKTRACE_GENERATION_FAILED: ", e)
      return "STACKTRACE_GENERATION_FAILED"
    }
  }

  /**
   * Used to generate a string that can be used as a message field in ELK and in console output
   * @private
   */
  private concatAllRelevantInfo() {
    const { errorName, httpStatus, description, contextData, debugData } = this
    let msg = `${this.constructor.name}(ERROR_NAME: ${errorName} | HTTP_STATUS: ${httpStatus} | ERR_ID: ${this.errorTraceId}`
    if (description) msg += ` | ERROR_DESCRIPTION: ${description}`
    if (contextData) msg += ` | CONTEXT_DATA: ${util.inspect(contextData, INSPECT_SHOW_HIDDEN, INSPECT_DEPTH)})`
    if (debugData) msg += ` | DEBUG_DATA: ${util.inspect(debugData, INSPECT_SHOW_HIDDEN, INSPECT_DEPTH)})`
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
    this.setStacktraceFromAnotherError(innerError)
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

  /*
   * Adds additional debug data to the response object. Existing debug data will be merged with the new data.
   * @param {Record<string, any>} debugData - The debug data to be included with the error.
   * @returns {AppException} - The modified AppException object with the enriched debug data
   */
  setDebugData(debugData: Record<string, any>) {
    this.debugData = { ...this.debugData, ...debugData }
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
    }
    const isSecurityRelated =
      this.httpStatus === HttpStatus.UNAUTHORIZED || // 401
      this.httpStatus === HttpStatus.FORBIDDEN || // 403
      this.httpStatus === HttpStatus.PROXY_AUTHENTICATION_REQUIRED // 407
    if (this.errorName === "SecurityException" && isSecurityRelated) {
      // Don't leak security information in production
    } else {
      // obj.message = this.description
      obj.contextData = this.contextData
    }
    // Additional error details are included for BAD_REQUEST and NOT_FOUND errors
    // to provide more context to the client.
    if (this.httpStatus === HttpStatus.BAD_REQUEST || this.httpStatus === HttpStatus.NOT_FOUND) {
      obj.message = this.description
    }

    if (!hideErrorDetails) {
      // This will like this until phased out.
      obj.debugMessage = "REDACTED"
      obj.stacktrace = "REDACTED"
    } else {
      if (this.debugData && Object.keys(this.debugData).length > 0) {
        obj.note = "Please lookup error details in the logs. Debug data is available."
      } else {
        obj.note = "Please lookup error details in the logs."
      }
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
    } else if (innerError[key] instanceof Date) {
      // Convert Date to ISO string
      result[key] = innerError[key].toISOString()
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
