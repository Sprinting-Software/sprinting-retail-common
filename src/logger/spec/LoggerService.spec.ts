import { LoggerService, LogLevel } from "../LoggerService"

import Transport from "winston-transport"

// Create a custom transport for testing
class MockTransport extends Transport {
  public logMessages: any[]
  constructor() {
    super({})
    this.logMessages = []
  }

  log(info, callback) {
    this.logMessages.push(info)
    if (callback) {
      callback()
    }
    this.emit("logged", info)
  }
}

describe("LoggerService", () => {
  const mockConfig = {
    env: "test",
    serviceName: "test-service",
    enableLogs: true,
    enableConsoleLogs: true,
    logstash: {
      isUDPEnabled: false,
      host: "localhost",
      port: 9200,
    },
  }

  const mockTransport = new MockTransport()
  const loggerService = new LoggerService(mockConfig, [mockTransport])

  afterEach(() => {
    jest.clearAllMocks()
  })

  it("should send info correctly 1", () => {
    loggerService.info("test-file", "SomeMessage")
    expect(mockTransport.logMessages.pop()).toMatchInlineSnapshot(
      { timestamp: expect.any(String) },
      `
        {
          "component": "test-service",
          "env": "test",
          "filename": "test-file",
          "level": "info",
          "logType": "info",
          "message": "SomeMessage",
          "system": "test-service",
          "systemEnv": "test-test-service",
          "timestamp": Any<String>,
          Symbol(level): "info",
        }
      `
    )
  })

  it("should send info correctly 2", () => {
    loggerService.info(
      "test-file",
      "SomeMessage",
      { someKey: "someValue" },
      {
        tenantId: 100,
        clientTraceId: "CT-2342",
        userId: "userId",
        requestTraceId: "RQ-dsfsdf",
        transactionName: "txname",
      }
    )
    const obj = mockTransport.logMessages.pop()
    delete obj.timestamp
    delete obj[Symbol.for("level")]
    expect(obj).toEqual({
      component: "test-service",
      context: {
        clientTraceId: "CT-2342",
        requestTraceId: "RQ-dsfsdf",
        tenant: "tid100",
        transactionName: "txname",
        userId: "userId",
      },
      env: "test",
      filename: "test-file",
      level: "info",
      logType: "info",
      message: "SomeMessage { someKey: 'someValue' }",
      system: "test-service",
      systemEnv: "test-test-service",
    })

    // Add more assertions as needed
  })

  it("should log a debug message", () => {
    const spy = jest.spyOn(LoggerService["logger"], "warn")
    loggerService.debug("test-file", "test-message")
    expect(spy).toHaveBeenCalledTimes(1)
    expect(spy).toHaveBeenCalledWith(
      expect.objectContaining({
        filename: "test-file",
        system: mockConfig.serviceName,
        component: "test-service",
        env: mockConfig.env,
        systemEnv: "test-test-service",
        logType: LogLevel.warn,
        message: "test-message",
      })
    )
  })

  it("should send events correctly", () => {
    loggerService.event(
      "test-file",
      "SomeEvent",
      "Payment",
      "SomeDomain",
      { someKey: "someValue" },
      {
        tenantId: 100,
        clientTraceId: "xxx",
        userId: "userId",
        requestTraceId: "RQ-dsfsdf",
        transactionName: "txname",
      }
    )
    const obj = mockTransport.logMessages.pop()
    delete obj.timestamp
    delete obj[Symbol.for("level")]
    expect(obj).toEqual({
      component: "test-service",
      env: "test",
      filename: "test-file",
      level: "info",
      logType: "event",
      message: 'SomeEvent {"someKey":"someValue"}',
      system: "test-service",
      systemEnv: "test-test-service",
      event: {
        category: "Payment",
        data: {
          someKey: "someValue",
        },
        domain: "SomeDomain",
        name: "SomeEvent",
      },
      context: {
        clientTraceId: "xxx",
        requestTraceId: "RQ-dsfsdf",
        tenant: "tid100",
        transactionName: "txname",
        userId: "userId",
      },
    })
    // Add more assertions as needed
  })

  it("should log an event", () => {
    loggerService.event(
      "test-file",
      "SomeEvent",
      "Payment",
      "Payment",
      { someKey: "someValue" },

      {
        tenantId: 100,
        clientTraceId: "xxx",
        userId: "userId",
        requestTraceId: "RQ-dsfsdf",
        transactionName: "txname",
      }
    )
    const obj = mockTransport.logMessages.pop()
    delete obj.timestamp
    delete obj[Symbol.for("level")]
    expect(obj).toEqual({
      component: "test-service",
      env: "test",
      filename: "test-file",
      level: "info",
      logType: "event",
      message: 'SomeEvent {"someKey":"someValue"}',
      system: "test-service",
      systemEnv: "test-test-service",
      event: {
        category: "Payment",
        domain: "Payment",
        name: "SomeEvent",
        data: {
          someKey: "someValue",
        },
      },
      context: {
        clientTraceId: "xxx",
        requestTraceId: "RQ-dsfsdf",
        tenant: "tid100",
        transactionName: "txname",
        userId: "userId",
      },
    })
  })
})
