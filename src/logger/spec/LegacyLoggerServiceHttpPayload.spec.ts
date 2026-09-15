import { AsyncContext } from "../../asyncLocalContext/AsyncContext"
import { ElkBufferedTcpLogger } from "../ElkBufferedTcpLogger"
import { ElkRestApi } from "../ElkRestApi"
import { LegacyLoggerService } from "../LegacyLoggerService"

describe("LegacyLoggerService.httpPayload", () => {
  const call = { direction: "outbound" as const, method: "GET", domain: "api.sprinting.io", path: "/api/v2/orders/1" }
  const asyncContext = new AsyncContext(
    {},
    { allowDefaultContextPropertyInitialization: true, allowDefaultContextPropertyInitializationRepeatedly: true }
  )
  // ElkBufferedTcpLogger.start() schedules a real, self-rescheduling setTimeout that will fire
  // during the test run and attempt a real network call unless mocked and explicitly stopped.
  const instances: LegacyLoggerService[] = []

  beforeEach(() => {
    jest.spyOn(ElkRestApi.prototype, "sendManyDocuments").mockResolvedValue(undefined)
  })

  afterEach(async () => {
    for (const instance of instances.splice(0)) {
      await (instance as any).destroyTcpLoggers()
    }
    jest.restoreAllMocks()
  })

  it("does nothing when httpPayloadLogging isn't configured (no elkRestApi either)", () => {
    const sendObjectSpy = jest.spyOn(ElkBufferedTcpLogger.prototype, "sendObject")
    const loggerService = new LegacyLoggerService(
      {
        env: "test",
        serviceName: "TestSystemName",
        enableConsoleLogs: false,
        elkLogstash: { isUDPEnabled: false, host: "localhost", port: 9200 },
      },
      [],
      asyncContext
    )
    instances.push(loggerService)

    expect(() => loggerService.httpPayload(call)).not.toThrow()
    expect(sendObjectSpy).not.toHaveBeenCalled()
  })

  it("sends a document via the buffered REST/TCP transport when httpPayloadLogging is configured", () => {
    const sendObjectSpy = jest.spyOn(ElkBufferedTcpLogger.prototype, "sendObject")
    const loggerService = new LegacyLoggerService(
      {
        env: "test",
        serviceName: "TestSystemName",
        enableConsoleLogs: false,
        elkLogstash: { isUDPEnabled: false, host: "localhost", port: 9200 },
        elkRestApi: {
          useForEvents: false,
          useForErrors: false,
          enableTcpSender: false,
          endpoint: "http://localhost:9999",
          apiKey: "test-api-key",
        },
        httpPayloadLogging: { defaultSamplingRate: 1, rules: [] },
      },
      [],
      asyncContext
    )
    instances.push(loggerService)

    loggerService.httpPayload({ ...call, statusCode: 200, payload: { password: "secret", orderId: "o-1" } })

    expect(sendObjectSpy).toHaveBeenCalledTimes(1)
    const doc = sendObjectSpy.mock.calls[0][0] as Record<string, any>
    expect(doc).toMatchObject({
      direction: "outbound",
      httpMethod: "GET",
      httpDomain: "api.sprinting.io",
      httpPath: "/api/v2/orders/1",
      statusCode: 200,
      logType: "httpPayload",
      httpLogType: "OutboundHttpCall",
      system: "TestSystemName",
    })
    expect(doc.payload).toEqual(expect.objectContaining({ password: "REDACTED", orderId: "o-1" }))
  })

  it("does not send when sampled out", () => {
    const sendObjectSpy = jest.spyOn(ElkBufferedTcpLogger.prototype, "sendObject")
    jest.spyOn(Math, "random").mockReturnValue(0.9)
    const loggerService = new LegacyLoggerService(
      {
        env: "test",
        serviceName: "TestSystemName",
        enableConsoleLogs: false,
        elkLogstash: { isUDPEnabled: false, host: "localhost", port: 9200 },
        elkRestApi: {
          useForEvents: false,
          useForErrors: false,
          enableTcpSender: false,
          endpoint: "http://localhost:9999",
          apiKey: "test-api-key",
        },
        httpPayloadLogging: { defaultSamplingRate: 0.5, rules: [] },
      },
      [],
      asyncContext
    )
    instances.push(loggerService)

    loggerService.httpPayload(call)

    expect(sendObjectSpy).not.toHaveBeenCalled()
  })
})
