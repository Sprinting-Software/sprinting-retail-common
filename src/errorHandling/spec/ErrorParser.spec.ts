import { AppException } from "../exceptions/AppException"
import { HttpStatus } from "@nestjs/common"
import { ClientException } from "../exceptions/ClientException"
import { ErrorParser } from "../ErrorParser"
import { ServerException } from "../exceptions/ServerException"

describe("ErrorParser", () => {
  it("should parse ClientException", () => {
    const e = new ClientException("ERROR_NAME", "ERROR_DESCRIPTION", { key: "value" })
    const e2 = ErrorParser.parse(e)
    expect(e2).toBe(e)
    expect(e2).toEqual(e)
    expect(e2 === e).toBeTruthy()
  })
  it("should parse AppException", () => {
    const e = new AppException(HttpStatus.INTERNAL_SERVER_ERROR, "ERROR_NAME", "ERROR_DESCRIPTION", { key: "value" })
    const e2 = ErrorParser.parse(e)
    expect(e2).toBe(e)
    expect(e2).toEqual(e)
    expect(e2 === e).toBeTruthy()
  })
  it("should parse ClientException", () => {
    const e = new ServerException("ERROR_NAME", "ERROR_DESCRIPTION", { key: "value" })
    const e2 = ErrorParser.parse(e)
    expect(e2).toBe(e)
    expect(e2).toEqual(e)
    expect(e2 === e).toBeTruthy()
  })

  it("should parse Error", () => {
    const e = new Error("ERROR_NAME")
    const e2 = ErrorParser.parse(e)
    expect(e2).toBeInstanceOf(AppException)
    expect(e2.errorName).toEqual("Error")
    expect(e2.description).toEqual("ERROR_NAME")
  })
})
