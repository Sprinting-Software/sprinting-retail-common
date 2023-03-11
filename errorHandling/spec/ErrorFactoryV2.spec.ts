import { HttpStatus } from "@nestjs/common"
import { ErrorFactoryV2 } from "../ErrorFactoryV2"

describe("ErrorFactoryV2", () => {
  describe("createNamedException", () => {
    it("should create a named exception with the specified properties", () => {
      const error = ErrorFactoryV2.createNamedException(
        "MyError",
        "Something went wrong",
        { reason: "Unknown" },
        new Error("Inner error")
      )

      expect(error.httpStatus).toEqual(HttpStatus.BAD_REQUEST)
      expect(error.errorName).toEqual("MyError")
      expect(error.description).toEqual("Something went wrong")
      expect(error.contextData).toEqual({ reason: "Unknown" })
      expect(error.innerError).toBeInstanceOf(Error)
      expect(error.innerError.message).toEqual("Inner error")
    })
  })

  describe("createUnnamedException", () => {
    it("should create an unnamed exception with the specified properties", () => {
      const error = ErrorFactoryV2.createUnnamedException(
        "Something went wrong",
        { reason: "Unknown" },
        new Error("Inner error")
      )

      expect(error.httpStatus).toEqual(HttpStatus.INTERNAL_SERVER_ERROR)
      expect(error.errorName).toEqual(HttpStatus[HttpStatus.INTERNAL_SERVER_ERROR])
      expect(error.description).toEqual("Something went wrong")
      expect(error.contextData).toEqual({ reason: "Unknown" })
      expect(error.innerError).toBeInstanceOf(Error)
      expect(error.innerError.message).toEqual("Inner error")
    })
  })

  describe("createHttpException", () => {
    it("should create an http exception with the specified properties", () => {
      const error = ErrorFactoryV2.createHttpException(
        HttpStatus.NOT_FOUND,
        "Resource not found",
        { resource: "users" },
        new Error("Inner error")
      )

      expect(error.httpStatus).toEqual(HttpStatus.NOT_FOUND)
      expect(error.errorName).toEqual("NOT_FOUND")
      expect(error.description).toEqual("Resource not found")
      expect(error.contextData).toEqual({ resource: "users" })
      expect(error.innerError).toBeInstanceOf(Error)
      expect(error.innerError.message).toEqual("Inner error")
    })
  })

  describe("parseAnyError", () => {
    it("should return the same common exception if given one", () => {
      const existingError = ErrorFactoryV2.createNamedException(
        "MyError",
        "Something went wrong",
        { reason: "Unknown" },
        new Error("Inner error")
      )

      const parsedError = ErrorFactoryV2.parseAnyError(existingError)

      expect(parsedError).toBe(existingError)
    })

    it("should create an unnamed exception with the inner error if given an Error object", () => {
      const existingError = new Error("Something went wrong")

      const parsedError = ErrorFactoryV2.parseAnyError(existingError)

      expect(parsedError.httpStatus).toEqual(HttpStatus.INTERNAL_SERVER_ERROR)
      expect(parsedError.errorName).toEqual(HttpStatus[HttpStatus.INTERNAL_SERVER_ERROR])
      expect(parsedError.description).toBeUndefined()
      expect(parsedError.contextData).toEqual({})
      expect(parsedError.innerError).toBe(existingError)
    })

    it("should create an unnamed exception with the inner error if given a string", () => {
      const existingError = "Something went wrong"

      const parsedError = ErrorFactoryV2.parseAnyError(existingError)

      expect(parsedError.httpStatus).toEqual(HttpStatus.INTERNAL_SERVER_ERROR)
      expect(parsedError.description).toBeUndefined()
      expect(parsedError.contextData).toEqual({})
      expect(parsedError.innerError).toEqual("An error of type string was thrown: Something went wrong")
    })
  })
})
