import { BadRequestException } from "@nestjs/common"
import { CustomBadRequestException } from "../exceptions/CustomBadRequestException"
import { AppExceptionResponseV2 } from "../exceptions/AppException"

describe("CustomBadRequestException", () => {
  describe("constructor", () => {
    it("should set the http status, error name, and error message correctly", () => {
      // Arrange
      const exception = new BadRequestException("Error message")

      // Act
      const customException = new CustomBadRequestException(exception)

      // Assert
      expect(customException.httpStatus).toBe(400)
      expect(customException.errorName).toBe("BadRequestException")
      expect(customException.description).toBe("Error message")
    })

    it("should set the validation errors correctly", () => {
      // Arrange
      const validationErrors = {
        message: {
          name: ["Name is required"],
          age: ["Age must be a number"],
        },
      }
      const exception = new BadRequestException(validationErrors)

      // Act
      const customException = new CustomBadRequestException(exception)

      // Assert
      expect(customException.errors).toEqual(validationErrors.message)
    })
  })

  describe("toString", () => {
    it("should return a string with the error name, http status, error message, and validation errors", () => {
      // Arrange
      const validationErrors = {
        message: {
          name: ["Name is required"],
          age: ["Age must be a number"],
        },
      }
      const exception = new BadRequestException(validationErrors)
      const customException = new CustomBadRequestException(exception)

      // Act
      const result = customException.toString()

      // Assert
      expect(result).toContain(customException.errorName)
      expect(result).toContain(customException.httpStatus.toString())
      expect(result).toContain(customException.description)
      expect(result).toContain(JSON.stringify(customException.errors))
    })
  })

  describe("getResponse", () => {
    it("should return an object with the http status, error name, and validation errors", () => {
      // Arrange
      const validationErrors = {
        name: ["Name is required"],
        age: ["Age must be a number"],
      }
      const exception = new BadRequestException(validationErrors)
      const customException = new CustomBadRequestException(exception)

      // Act
      const result: AppExceptionResponseV2 = customException.getResponse() as AppExceptionResponseV2

      // Assert
      expect(result.httpStatus).toBe(customException.httpStatus)
      expect(result.errorName).toBe(customException.errorName)
      expect(result.message).toEqual(customException.errors)
    })
  })
})
