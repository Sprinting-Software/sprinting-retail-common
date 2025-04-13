import { Exception, convertErrorToObjectForLogging } from "../Exception"
import { HttpStatus } from "@nestjs/common"
import { SecurityException } from "../SecurityException"

describe("AppException", () => {
  describe("getResponse()", () => {
    it("should return the expected response object", () => {
      const appException = new Exception(HttpStatus.BAD_REQUEST, "ERROR_NAME", "ERROR_DESCRIPTION", { key: "value" })
      const response: any = appException.getResponse(false)
      expect(response.errorTraceId).toBeDefined()
      delete response.errorTraceId
      delete response.stacktrace
      delete response.debugMessage
      expect(response).toEqual({
        httpStatus: HttpStatus.BAD_REQUEST,
        errorName: "ERROR_NAME",
        contextData: { key: "value" },
      })
    })

    it("should produce correct response - non-prod zone - normal error", () => {
      const appException: any = new Exception(HttpStatus.BAD_REQUEST, "ERROR_NAME", "ERROR_DESCRIPTION", {
        key: "value",
      })
      appException["errorTraceId"] = "xxx"
      appException.refreshMessageField()
      expect(appException.getResponse(false, false)).toMatchInlineSnapshot(
        { stacktrace: expect.any(String) },
        `
        {
          "contextData": {
            "key": "value",
          },
          "debugMessage": "REDACTED",
          "errorName": "ERROR_NAME",
          "errorTraceId": "xxx",
          "httpStatus": 400,
          "stacktrace": Any<String>,
        }
      `
      )
    })

    it("should produce correct response - prod zone - normal error", () => {
      const appException: any = new Exception(HttpStatus.BAD_REQUEST, "ERROR_NAME", "ERROR_DESCRIPTION", {
        key: "value",
      })
      appException["errorTraceId"] = "xxx"
      appException.refreshMessageField()
      expect(appException.getResponse(true, true)).toMatchInlineSnapshot(`
        {
          "contextData": {
            "key": "value",
          },
          "errorName": "ERROR_NAME",
          "errorTraceId": "xxx",
          "httpStatus": 400,
          "note": "Please lookup error details in the logs.",
        }
      `)
    })

    it("should produce correct response - nonprod zone - SecurityException", () => {
      const appException: any = new SecurityException("Description", {
        key: "value",
      })
      appException["errorTraceId"] = "xxx"
      appException.refreshMessageField()
      expect(appException.getResponse(false, false)).toMatchInlineSnapshot(
        { stacktrace: expect.any(String) },
        `
        {
          "debugMessage": "REDACTED",
          "errorName": "SecurityException",
          "errorTraceId": "xxx",
          "httpStatus": 403,
          "stacktrace": Any<String>,
        }
      `
      )
    })

    it("should produce correct response - prod zone - SecurityException", () => {
      const appException: any = new SecurityException("Description", {
        key: "value",
      })
      appException["errorTraceId"] = "xxx"
      appException.refreshMessageField()
      expect(appException.getResponse(true, true)).toMatchInlineSnapshot(`
        {
          "errorName": "SecurityException",
          "errorTraceId": "xxx",
          "httpStatus": 403,
          "note": "Please lookup error details in the logs.",
        }
      `)
    })

    it("should return the expected response object without message and contextData", () => {
      const appException = new Exception(HttpStatus.BAD_REQUEST, "ERROR_NAME")
      const response: any = appException.getResponse(false)
      expect(response.errorTraceId).toBeDefined()
      delete response.errorTraceId
      delete response.stacktrace
      delete response.debugMessage
      expect(response).toEqual({
        httpStatus: HttpStatus.BAD_REQUEST,
        errorName: "ERROR_NAME",
        message: undefined,
        contextData: {},
      })
    })
  })

  describe("toString()", () => {
    it("should return the expected string representation of the exception with all optional fields", () => {
      const innerError = new Error("Inner error message")
      const appException = new Exception(
        HttpStatus.BAD_REQUEST,
        "Some error name",
        "Some description ",
        { somekey: "someValue" },
        innerError
      )
      const expectedString = "Some error name | HTTP_STATUS: 400"
      const expectedString2 = "ERROR_DESCRIPTION: Some description  | CONTEXT_DATA: { somekey: 'someValue' }"
      expect(appException.toString()).toContain(expectedString)
      expect(appException.toString()).toContain(expectedString2)
    })

    it("should return the expected string with inner AppException", () => {
      const innerError = new Exception(
        HttpStatus.INTERNAL_SERVER_ERROR,
        "Some internal server error name",
        "Some internal server error description ",
        { somekey: "someValue" },
        new Error("Some inner inner error")
      )
      const appException = new Exception(
        HttpStatus.BAD_REQUEST,
        "Some error name",
        "Some description ",
        { somekey: "someValue" },
        innerError
      )
      const expectedString = "Some error name"
      const expectedString2 = "Some description"
      expect(appException.toString()).toContain(expectedString)
      expect(appException.toString()).toContain(expectedString2)
      expect(appException.message).toContain("Some error name")
      expect(appException.stack).toContain("Some inner inner error")
    })

    it("should generate a pretty stacktrace", () => {
      const innerError = new Exception(
        HttpStatus.INTERNAL_SERVER_ERROR,
        "Some internal server error name",
        "Some internal server error description ",
        { somekey: "someValue" },
        new Error("Some inner inner error")
      )
      const appException = new Exception(
        HttpStatus.BAD_REQUEST,
        "Some error name",
        "Some description ",
        { somekey: "someValue" },
        innerError
      )
      expect(appException.generatePrettyStacktrace()).toContain(`/src/errorHandling/exceptions/spec/Exception.spec.ts`)
    })

    it("should return the expected string representation of the exception with only required fields", () => {
      const appException = new Exception(HttpStatus.BAD_REQUEST, "ERROR_NAME")
      const expectedString = "HTTP_STATUS: 400"
      expect(appException.toString()).toContain(expectedString)
    })

    it("should set the errorName to the HttpStatus name if not provided", () => {
      const exception = new Exception(HttpStatus.AMBIGUOUS, undefined as unknown as string)
      const expectedString = `HTTP_STATUS: 300`
      expect(exception.toString()).toContain(expectedString)
    })

    it("should truncate messages exceeding max length, and end with truncation note", () => {
      const maxLength = 8445
      const errorMessage = Array(maxLength + 1).join("X")
      const truncateSuffix = "...TRUNCATED"
      const exception = new Exception(HttpStatus.INTERNAL_SERVER_ERROR, errorMessage)
      const strException = exception.toString()
      expect(strException.length).toEqual(maxLength + truncateSuffix.length)
      expect(strException).toContain(truncateSuffix)
    })
  })

  describe("setInnerError()", () => {
    it("should add the innerError to the exception", () => {
      const innerError = new Error("Inner error message")
      const appException = new Exception(HttpStatus.BAD_REQUEST, "ERROR_NAME").setInnerError(innerError)
      expect(appException.innerError).toEqual(innerError)
    })
  })

  describe("setContextData()", () => {
    it("should add the contextData to the exception", () => {
      const contextData = { key: "value" }
      const appException = new Exception(HttpStatus.BAD_REQUEST, "ERROR_NAME").setContextData(contextData)
      expect(appException.contextData).toEqual(contextData)
    })
  })
})

describe("convertErrorToObjectForLogging", () => {
  it('should return "MAX_DEPTH_REACHED" when depth is greater than 3', () => {
    const error = new Error("Test error")
    const result = convertErrorToObjectForLogging(error, 4)
    expect(result).toMatchInlineSnapshot(`"MAX_DEPTH_REACHED"`)
  })

  it("should convert a simple error object correctly", () => {
    const error = { message: "Test error", code: 500 }
    const result = convertErrorToObjectForLogging(error, 0)
    expect(result).toMatchInlineSnapshot(`
      {
        "code": "500",
        "message": "Test error",
      }
    `)
  })

  it("should handle simple error", () => {
    const error = new Error("Some error")
    const result = convertErrorToObjectForLogging(error, 0)
    expect(result).toMatchInlineSnapshot(`
      {
        "message": "Some error",
      }
    `)
  })
  it("should remove stack trace from the error object", () => {
    const error = { message: "Test error", stack: "Error stack trace" }
    const result = convertErrorToObjectForLogging(error, 0)
    expect(result).toMatchInlineSnapshot(`
      {
        "message": "Test error",
      }
    `)
  })

  it("should handle nested error objects", () => {
    const nestedError = { message: "Nested error" }
    const error = { message: "Outer error", nested: nestedError }
    const result = convertErrorToObjectForLogging(error, 0)
    expect(result).toMatchInlineSnapshot(`
      {
        "message": "Outer error",
        "nested": {
          "message": "Nested error",
        },
      }
    `)
  })

  it("should skip functions", () => {
    const error: any = new Error("Some error")
    error.someFunction = function (x: number) {
      return x + 1
    }
    const result = convertErrorToObjectForLogging(error, 0)
    expect(result).toMatchInlineSnapshot(`
      {
        "message": "Some error",
      }
    `)
  })

  it("should handle circular references", () => {
    const error: any = { message: "Outer error", inner: { messageInner: "some" } }
    error.circular = error
    error.inner.circular = error
    const result = convertErrorToObjectForLogging(error, 0)
    expect(result).toMatchInlineSnapshot(`
      {
        "inner": {
          "messageInner": "some",
        },
        "message": "Outer error",
      }
    `)
  })

  it("should handle Error instances", () => {
    const error = new Error("Test error")
    const result = convertErrorToObjectForLogging({ error }, 0)
    expect(result).toMatchInlineSnapshot(`
      {
        "error": {
          "message": "Test error",
        },
      }
    `)
  })

  it("should handle complex nested structures", () => {
    const error = {
      message: "Outer error",
      nested: {
        message: "Nested error",
        inner: new Error("Inner error"),
      },
    }
    const result = convertErrorToObjectForLogging(error, 0)
    expect(result).toMatchInlineSnapshot(`
      {
        "message": "Outer error",
        "nested": {
          "inner": {
            "message": "Inner error",
          },
          "message": "Nested error",
        },
      }
    `)
  })
  it("should handle date object", () => {
    const error = {
      message: "Outer error",
      timestamp: new Date(),
    }
    const result = convertErrorToObjectForLogging(error, 0)
    expect(result.timestamp).toBeDefined()
  })
})
