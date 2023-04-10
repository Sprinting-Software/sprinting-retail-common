import { AppException } from "../AppException"
import { HttpStatus } from "@nestjs/common"

describe("AppException", () => {
  describe("getResponse()", () => {
    it("should return the expected response object", () => {
      const appException = new AppException(HttpStatus.BAD_REQUEST, "ERROR_NAME", "ERROR_DESCRIPTION", { key: "value" })
      const response = appException.getResponse()
      expect(response.errorTraceId).toBeDefined()
      delete response.errorTraceId
      expect(response).toEqual({
        statusCode: HttpStatus.BAD_REQUEST,
        errorName: "ERROR_NAME",
        message: "ERROR_DESCRIPTION",
        contextData: { key: "value" },
      })
    })

    it("should return the expected response object without message and contextData", () => {
      const appException = new AppException(HttpStatus.BAD_REQUEST, "ERROR_NAME")
      const response = appException.getResponse()
      expect(response.errorTraceId).toBeDefined()
      delete response.errorTraceId
      expect(response).toEqual({
        statusCode: HttpStatus.BAD_REQUEST,
        errorName: "ERROR_NAME",
        message: undefined,
        contextData: undefined,
      })
    })
  })

  describe("toString()", () => {
    it("should return the expected string representation of the exception with all optional fields", () => {
      const innerError = new Error("Inner error message")
      const appException = new AppException(
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
      const innerError = new AppException(
        HttpStatus.INTERNAL_SERVER_ERROR,
        "Some internal server error name",
        "Some internal server error description ",
        { somekey: "someValue" },
        new Error("Some inner inner error")
      )
      const appException = new AppException(
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

    it("should return the expected string representation of the exception with only required fields", () => {
      const appException = new AppException(HttpStatus.BAD_REQUEST, "ERROR_NAME")
      const expectedString = "AppException ERROR_NAME (HTTP_STATUS 400)"
      expect(appException.toString()).toContain(expectedString)
    })

    it("should set the errorName to the HttpStatus name if not provided", () => {
      const exception = new AppException(HttpStatus.AMBIGUOUS, undefined)
      const expectedString = `AppException AMBIGUOUS (HTTP_STATUS 300)`
      expect(exception.toString()).toContain(expectedString)
    })
  })

  describe("setInnerError()", () => {
    it("should add the innerError to the exception", () => {
      const innerError = new Error("Inner error message")
      const appException = new AppException(HttpStatus.BAD_REQUEST, "ERROR_NAME").setInnerError(innerError)
      expect(appException.innerError).toEqual(innerError)
    })
  })

  describe("setContextData()", () => {
    it("should add the contextData to the exception", () => {
      const contextData = { key: "value" }
      const appException = new AppException(HttpStatus.BAD_REQUEST, "ERROR_NAME").setContextData(contextData)
      expect(appException.contextData).toEqual(contextData)
    })
  })
})
