import { BadRequestException, HttpException } from "@nestjs/common"
import { ErrorFactory } from "./ErrorFactory"
import { HttpException as CustomHttpException } from "./HttpException"

describe("ErrorFactory", () => {
  describe("createError", () => {
    it("should create HttpException from string", () => {
      const error = ErrorFactory.createError("Test error")

      expect(error).toBeInstanceOf(HttpException)
      expect(error.message).toBe("Test error")
      expect(error.statusCode).toBe(400)
      expect(error.contextData).toBeUndefined()
      expect(error.detailedMessage).toContain("http status 400")
    })

    it("should create HttpException from string with custom status, context data, and detailed message", () => {
      const error = ErrorFactory.createError("Test error", 404, { key: "value" }, "Detailed message")

      expect(error).toBeInstanceOf(HttpException)
      expect(error.message).toBe("Test error")
      expect(error.statusCode).toBe(404)
      expect(error.contextData).toEqual({ key: "value" })
      expect(error.detailedMessage).toContain("Detailed message")
    })

    it("should create HttpException from error object", () => {
      const innerError = new Error("Inner error")
      const error = ErrorFactory.createError(innerError)

      expect(error).toBeInstanceOf(HttpException)
      expect(error.message).toBe("Error")
      expect(error.statusCode).toBe(400)
      expect(error.contextData).toBeUndefined()
      expect(error.detailedMessage).toContain("http status 400")
    })

    it("should create HttpException from HttpException object", () => {
      const innerError = new CustomHttpException(500, "Internal server error")
      const error = ErrorFactory.createError(innerError)

      expect(error).toBeInstanceOf(HttpException)
      expect(error.message).toBe("Internal server error")
      expect(error.statusCode).toBe(500)
      expect(error.contextData).toBeUndefined()
      expect(error.detailedMessage).toContain("detailedMessage: Internal server error")
    })

    it("should create HttpException from BadRequestException object", () => {
      const innerError = new BadRequestException("Invalid request")
      const error = ErrorFactory.createError(innerError)

      expect(error).toBeInstanceOf(HttpException)
      expect(error.message).toBe('"Invalid request"')
      expect(error.statusCode).toBe(400)
      expect(error.contextData).toBeUndefined()
      expect(error.detailedMessage).toContain("detailedMessage: Invalid request")
    })

    it("should create HttpException from BadRequestException object with custom context data and detailed message", () => {
      const innerError = new BadRequestException("Invalid request")
      const error = ErrorFactory.createError(innerError, undefined, { key: "value" }, "Detailed message")

      expect(error).toBeInstanceOf(HttpException)
      expect(error.message).toBe('"Invalid request"')
      expect(error.statusCode).toBe(400)
      expect(error.contextData).toEqual({ key: "value" })
      expect(error.detailedMessage).toContain(innerError.message)
    })
  })
})
