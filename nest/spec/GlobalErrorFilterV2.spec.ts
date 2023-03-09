import { LoggerServiceV2 } from "../../logger/LoggerServiceV2"
import { GlobalErrorFilterV2 } from "../GlobalErrorFilterV2"
import { ArgumentsHost } from "@nestjs/common"
import { ErrorFactoryV2 } from "../../errorHandling/ErrorFactoryV2"
import { LogContext } from "../../common/LogContext"
import { UserIdContext } from "../../common/UserIdContext"
import { TenantContext } from "../../common/TenantContext"

describe("GlobalErrorFilter", () => {
  let globalErrorFilter: GlobalErrorFilterV2
  let loggerService: LoggerServiceV2
  let argumentsHost: ArgumentsHost
  let response: any

  beforeEach(() => {
    loggerService = {
      logError: jest.fn(),
    } as any

    response = {
      status: jest.fn().mockReturnThis(),
      send: jest.fn(),
    } as any

    argumentsHost = {
      switchToHttp: jest.fn().mockReturnValue({
        getResponse: jest.fn().mockReturnValue(response),
      }),
    } as any

    globalErrorFilter = new GlobalErrorFilterV2(
      loggerService,
      new LogContext(new TenantContext(100), new UserIdContext("xxx"))
    )
  })

  it("should handle named exceptions", () => {
    const customException = ErrorFactoryV2.createNamedException("MyException", "Detailed message", {
      a: "someval",
      b: 1,
    }).setInnerError(new Error("Inner error"))
    globalErrorFilter.catch(customException, argumentsHost)
    expect(response.status).toHaveBeenCalledWith(customException.httpStatus)
    expect(response.send).toHaveBeenCalledWith(customException.toJson())
  })

  it("should handle Error", () => {
    const customException = new Error("Some error")
    globalErrorFilter.catch(customException, argumentsHost)
    const mappedException = ErrorFactoryV2.parseAnyError(customException)
    expect(response.status).toHaveBeenCalledWith(mappedException.httpStatus)
    //expect(response.send).toHaveBeenCalledWith(customException.toJson());
  })
})
