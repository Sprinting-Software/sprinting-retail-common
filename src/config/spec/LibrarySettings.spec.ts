import { HttpStatus } from "@nestjs/common"
import { LibrarySettings } from "../LibrarySettings"
import { Exception } from "../../errorHandling/exceptions/Exception"

describe("LibrarySettings", () => {
  afterEach(() => {
    LibrarySettings.resetForTests()
  })

  describe("defaults", () => {
    it("does not include the error message in the HTTP response by default", () => {
      expect(LibrarySettings.isConfigured).toBe(false)
      expect(LibrarySettings.includeErrorMessageInHttpResponse).toBe(false)
    })

    it("hides the description for a general (500) error when not opted in", () => {
      const exception = new Exception(HttpStatus.INTERNAL_SERVER_ERROR, "ERROR_NAME", "ERROR_DESCRIPTION", {
        key: "value",
      })
      const response: any = exception.getResponse(false)
      expect(response.message).toBeUndefined()
      expect(response.contextData).toEqual({ key: "value" })
    })
  })

  describe("configure()", () => {
    it("includes the description for a general (500) error once opted in", () => {
      LibrarySettings.configure({ includeErrorMessageInHttpResponse: true })
      expect(LibrarySettings.isConfigured).toBe(true)

      const exception = new Exception(HttpStatus.INTERNAL_SERVER_ERROR, "ERROR_NAME", "ERROR_DESCRIPTION", {
        key: "value",
      })
      const response: any = exception.getResponse(false)
      expect(response.message).toBe("ERROR_DESCRIPTION")
    })

    it("leaves unspecified options at their safe defaults", () => {
      LibrarySettings.configure({})
      expect(LibrarySettings.includeErrorMessageInHttpResponse).toBe(false)
    })

    it("terminates the process when configured more than once", () => {
      const exitSpy = jest.spyOn(process, "exit").mockImplementation((() => undefined) as never)

      LibrarySettings.configure({ includeErrorMessageInHttpResponse: true })
      LibrarySettings.configure({ includeErrorMessageInHttpResponse: false })

      expect(exitSpy).toHaveBeenCalledWith(1)
      exitSpy.mockRestore()
    })
  })
})
