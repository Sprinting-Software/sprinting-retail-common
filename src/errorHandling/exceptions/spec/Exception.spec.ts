import { Exception } from "../Exception"
import { HttpStatus } from "@nestjs/common"

describe("AppException", () => {
  describe("getResponse()", () => {
    it("should return the expected response object", () => {
      const appException = new Exception(HttpStatus.BAD_REQUEST, "ERROR_NAME", "ERROR_DESCRIPTION", { key: "value" })
      const response = appException.getResponse()
      expect(response.errorTraceId).toBeDefined()
      delete response.errorTraceId
      expect(response).toEqual({
        httpStatus: HttpStatus.BAD_REQUEST,
        errorName: "ERROR_NAME",
        message: "ERROR_DESCRIPTION",
        contextData: { key: "value" },
      })
    })

    it("should return the expected response object without message and contextData", () => {
      const appException = new Exception(HttpStatus.BAD_REQUEST, "ERROR_NAME")
      const response = appException.getResponse()
      expect(response.errorTraceId).toBeDefined()
      delete response.errorTraceId
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
      const expectedString = "Some error name (HTTP_STATUS 400)"
      const expectedString2 = "ERROR_DESCRIPTION - Some description  - CONTEXT_DATA: { somekey: 'someValue' }"
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
      const expectedString = "Some error name (HTTP_STATUS 400)"
      const expectedString2 = "ERROR_DESCRIPTION - Some description  - CONTEXT_DATA: { somekey: 'someValue' }"
      expect(appException.toString()).toContain(expectedString)
      expect(appException.toString()).toContain(expectedString2)
      expect(appException.message).toContain("Some error name")
      expect(appException.stack).toContain("Some error name")
    })

    it("should return the expected string representation of the exception with only required fields", () => {
      const appException = new Exception(HttpStatus.BAD_REQUEST, "ERROR_NAME")
      const expectedString = "Exception ERROR_NAME (HTTP_STATUS 400)"
      expect(appException.toString()).toContain(expectedString)
    })

    it("should set the errorName to the HttpStatus name if not provided", () => {
      const exception = new Exception(HttpStatus.AMBIGUOUS, undefined)
      const expectedString = `Exception AMBIGUOUS (HTTP_STATUS 300)`
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
