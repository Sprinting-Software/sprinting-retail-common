import { CommonException } from "../CommonException"
import util from "util"
import { Err } from "../Err"
import { HttpStatus } from "@nestjs/common"

describe("CommonException", () => {
  const httpStatus = 500
  const errorName = "TestError"
  const contextData = { somekey: "somevalue" }
  const description = "Test description"
  const innerError = new Error("Inner error message")

  describe("constructor", () => {
    it("should create a new instance of CommonException", () => {
      const exception = new CommonException(httpStatus, errorName)
      expect(exception).toBeInstanceOf(CommonException)
    })

    it("should set httpStatus, errorName, contextData, description, and innerError properties", () => {
      const exception = new CommonException(httpStatus, errorName, description, contextData, innerError)
      expect(exception.httpStatus).toEqual(httpStatus)
      expect(exception.errorName).toEqual(errorName)
      expect(exception.contextData).toEqual(contextData)
      expect(exception.description).toEqual(description)
      expect(exception.innerError).toEqual(innerError)
    })

    it("should set description and innerError to undefined if not provided", () => {
      const exception = new CommonException(httpStatus, errorName, undefined, contextData)
      expect(exception.description).toBeUndefined()
      expect(exception.innerError).toBeUndefined()
    })
  })

  describe("toPrintFriendlyString", () => {
    it("should return a string with error details", () => {
      const exception = new CommonException(httpStatus, errorName, description, contextData, innerError)
      const result = exception.toPrintFriendlyString()
      expect(result).toContain(errorName)
      expect(result).toContain(httpStatus.toString())
      expect(result).toContain(util.inspect(contextData))
      expect(result).toContain(description)
      expect(result).toContain(innerError.message)
    })
  })

  describe("toJson", () => {
    it("should return an object with error details", () => {
      const exception = new CommonException(httpStatus, errorName, description, contextData, innerError)
      const result = exception.toJson()
      expect(result.errorName).toEqual(errorName)
      expect(result.contextData).toEqual(contextData)
      expect(result.description).toEqual(description)
      expect(result.innerError).toEqual('{"httpStatus":502,"errorName":"Error","description":"Inner error message"}')
    })

    it("should return an object without inner error", () => {
      const exception = new CommonException(httpStatus, errorName, description, contextData)
      const result = exception.toJson()
      expect(result).toEqual({
        errorName,
        contextData,
        description,
      })
    })

    it("should return an object without inner error", () => {
      const exception = new CommonException(httpStatus, errorName, description, undefined)
      const result = exception.toJson()
      expect(result).toEqual({
        errorName,
        description,
      })
    })

    it("should ret  urn an object without inner error", () => {
      const exception = new CommonException(httpStatus, errorName)
      const result = exception.toJson()
      expect(result).toEqual({
        errorName,
      })
    })
  })

  describe("addContextData", () => {
    it("should add context data to the contextData property", () => {
      const exception = new CommonException(httpStatus, errorName, undefined, contextData)
      const newContextData = { newKey: "newValue" }
      const updatedException = exception.addContextData(newContextData)
      expect(updatedException.contextData).toEqual({ ...contextData, ...newContextData })
    })
  })

  describe("setInnerError", () => {
    it("should set the innerError property", () => {
      const exception = new CommonException(httpStatus, errorName)
      const updatedException = exception.setInnerError(innerError)
      expect(updatedException.innerError).toEqual(innerError)
    })
  })

  describe("setDescription", () => {
    it("should set the description property", () => {
      const exception = new CommonException(httpStatus, errorName)
      const updatedException = exception.setDescription(description)
      expect(updatedException.description).toEqual(description)
    })
  })

  describe("exception classes", () => {
    it("should log nicely nested exceptions", () => {
      const e1 = new Err.UnnamedException("Description of unnamed exception", { a: 1 })
      const e2 = new Err.NamedException500("SomeNamedException", "Description of SomeNamedException", { b: 2 }, e1)
      const e3 = new Err.NamedException(
        "SomeNamedClientException",
        "Description of SomeNamedClientException",
        { c: 3 },
        e2
      )
      const e4 = new Err.HttpException(HttpStatus.AMBIGUOUS, "Some description", { d: 4 }, e3)
      // eslint-disable-next-line no-console
      console.log(e4)
    })

    it("should log nicely UnnamedException", () => {
      const e1 = new Err.UnnamedException()
      // eslint-disable-next-line no-console
      console.log(e1)
    })
  })
})
