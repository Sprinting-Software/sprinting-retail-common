import { Exception } from "../exceptions/Exception"
import { HttpStatus } from "@nestjs/common"
import { ClientException } from "../exceptions/ClientException"
import { ExceptionUtil } from "../ExceptionUtil"
import { ServerException } from "../exceptions/ServerException"
import { SecurityException } from "../exceptions/SecurityException"
import { AssertionException } from "../exceptions/AssertionException"

describe("ExceptionUtil", () => {
  it("should parse ClientException", () => {
    const e = new ClientException("ERROR_NAME", "ERROR_DESCRIPTION", { key: "value" })
    const e2 = ExceptionUtil.parse(e)
    expect(e2).toBe(e)
    expect(e2).toEqual(e)
    expect(e2 === e).toBeTruthy()
  })
  it("should parse AppException", () => {
    const e = getComplexError()
    const e2 = ExceptionUtil.parse(e)
    expect(e2).toBe(e)
    expect(e2).toEqual(e)
    expect(e2 === e).toBeTruthy()
  })
  it("should parse ClientException", () => {
    const e = new ServerException("ERROR_NAME", "ERROR_DESCRIPTION", { key: "value" })
    const e2 = ExceptionUtil.parse(e)
    expect(e2).toBe(e)
    expect(e2).toEqual(e)
    expect(e2 === e).toBeTruthy()
  })

  it("should create plain objects from complex error 1", () => {
    expect(ExceptionUtil.toPlainJsonForSpec(getComplexError())).toMatchSnapshot()
  })
  it("should create plain objects from complex error 2", () => {
    expect(ExceptionUtil.toPlainJsonForSpec(getComplexError2())).toMatchSnapshot()
  })
  it("should create plain objects from complex error 3", () => {
    expect(ExceptionUtil.toPlainJsonForSpec(getComplexError3())).toMatchSnapshot()
  })
  it("should create plain objects from normal error", () => {
    expect(ExceptionUtil.toPlainJsonForSpec(getNormalError())).toMatchSnapshot()
  })

  it("should create plain objects from ClientException", () => {
    expect(ExceptionUtil.toPlainJsonForSpec(getClientException())).toMatchSnapshot()
  })

  it("should create plain objects from AssertionException", () => {
    expect(ExceptionUtil.toPlainJsonForSpec(getAssertionException())).toMatchSnapshot()
  })

  it("should create plain objects from SecurityException", () => {
    expect(ExceptionUtil.toPlainJsonForSpec(getSecurityException())).toMatchSnapshot()
  })

  it("should create plain objects from ServerException", () => {
    expect(ExceptionUtil.toPlainJsonForSpec(getServerException())).toMatchSnapshot()
  })

  it("should create plain objects from irregularError", () => {
    expect(ExceptionUtil.toPlainJsonForSpec(getIrregularError())).toMatchSnapshot()
  })
  it("should create plain objects from irregularError2", () => {
    expect(ExceptionUtil.toPlainJsonForSpec(getIrregularError2())).toMatchSnapshot()
  })

  it("should create plain objects from null error", () => {
    expect(ExceptionUtil.toPlainJsonForSpec(null)).toMatchSnapshot()
  })
  it("should create plain objects from undefined error", () => {
    expect(ExceptionUtil.toPlainJsonForSpec(undefined)).toMatchSnapshot()
  })
  it("should create plain objects from false error", () => {
    expect(ExceptionUtil.toPlainJsonForSpec(false)).toMatchSnapshot()
  })
})

function getComplexError() {
  return new Exception(HttpStatus.INTERNAL_SERVER_ERROR, "ERROR_NAME", "ERROR_DESCRIPTION", { key: "value" })
}
function getComplexError2() {
  return new Exception(
    HttpStatus.INTERNAL_SERVER_ERROR,
    "ERROR_NAME",
    "ERROR_DESCRIPTION",
    { key: "value" },
    new Error("Some Inner Error")
  )
}
function getComplexError3() {
  return new Exception(
    HttpStatus.INTERNAL_SERVER_ERROR,
    "ERROR_NAME",
    "ERROR_DESCRIPTION",
    { key: "value" },
    getComplexError2()
  )
}

function getSecurityException() {
  return new SecurityException("ERROR_DESCRIPTION", { key: "value" }, new Error("Some Inner Error"))
}
function getAssertionException() {
  return new AssertionException("ERROR_DESCRIPTION", { key: "value" }, new Error("Some Inner Error"))
}
function getClientException() {
  return new ClientException("SOME_ERROR_NAME", "ERROR_DESCRIPTION", { key: "value" }, new Error("Some Inner Error"))
}

function getServerException() {
  return new ServerException("SOME_ERROR_NAME", "ERROR_DESCRIPTION", { key: "value" }, new Error("Some Inner Error"))
}

function getNormalError() {
  return new Error("Some normal error")
}

function getIrregularError() {
  return "Some error as string"
}

function getIrregularError2() {
  return { errorName: "Some error as object" }
}
