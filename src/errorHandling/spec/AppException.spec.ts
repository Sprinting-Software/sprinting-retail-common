import { AppException } from "../AppException"
import { HttpStatus } from "@nestjs/common"

describe("AppException", () => {
  describe("getResponse()", () => {
    it("should return the expected response object", () => {
      const appException = new AppException(HttpStatus.BAD_REQUEST, "ERROR_NAME", "ERROR_DESCRIPTION", { key: "value" })
      const response = appException.getResponse()
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
        "ERROR_NAME",
        "ERROR_DESCRIPTION",
        { key: "value" },
        innerError
      )
      const expectedString =
        "ERROR_NAME (HTTP_STATUS 400)ERROR_DESCRIPTION - ERROR_DESCRIPTION - CONTEXT_DATA: { key: 'value' } - INNER_ERROR: Error: Inner error message"
      expect(appException.toString()).toContain(expectedString)
    })

    it("should return the expected string representation of the exception with only required fields", () => {
      const appException = new AppException(HttpStatus.BAD_REQUEST, "ERROR_NAME")
      const expectedString = "ERROR_NAME (HTTP_STATUS 400)"
      expect(appException.toString()).toEqual(expectedString)
    })

    it("should set the errorName to the HttpStatus name if not provided", () => {
      const exception = new AppException(HttpStatus.AMBIGUOUS, undefined)
      const expectedString = `${HttpStatus[HttpStatus.AMBIGUOUS]} (HTTP_STATUS 300)`
      expect(exception.toString()).toEqual(expectedString)
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
