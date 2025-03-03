import { LoggerService } from "../LoggerService"

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

function clean(obj) {
  delete obj.timestamp
  delete obj["@timestamp"]
  delete obj[Symbol.for("level")]
  delete obj[Symbol.for("message")]
}

describe("LoggerService", () => {
  const mockConfig = {
    env: "test",
    serviceName: "TestSystemName",
    enableElkLogs: true,
    enableConsoleLogs: true,
    elkLogstash: {
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
    const actual = mockTransport.logMessages.pop()
    delete actual[Symbol.for("message")]

    delete actual.timestamp
    delete actual["@timestamp"]
    delete actual[Symbol.for("level")]
    delete actual[Symbol.for("message")]
    expect(actual).toEqual({
      component: "TestSystemName",
      "ecs.version": "8.10.0",
      env: "test",
      filename: "test-file",
      labels: {
        envTags: undefined,
      },
      processor: {
        event: "log",
      },
      "log.level": "info",
      logType: "info",
      message: "SomeMessage",
      system: "TestSystemName",
      systemEnv: `test-TestSystemName`,
    })
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
    clean(obj)
    expect(obj).toEqual({
      component: "TestSystemName",
      "ecs.version": "8.10.0",
      context: {
        clientTraceId: "CT-2342",
        requestTraceId: "RQ-dsfsdf",
        tenant: "tid100",
        transactionName: "txname",
        userId: "userId",
      },
      env: "test",
      filename: "test-file",
      labels: {
        envTags: undefined,
      },
      processor: {
        event: "log",
      },
      "log.level": "info",
      logType: "info",
      message: "SomeMessage { someKey: 'someValue' }",
      system: "TestSystemName",
      systemEnv: `test-TestSystemName`,
    })
  })

  it("should send events correctly", () => {
    loggerService.event("test-file", "SomeEvent", "Payment", "SomeDomain", { someKey: "someValue" }, undefined, {
      tenantId: 100,
      clientTraceId: "xxx",
      userId: "userId",
      requestTraceId: "RQ-dsfsdf",
      transactionName: "txname",
    })
    const obj = mockTransport.logMessages.pop()
    clean(obj)
    expect(obj).toEqual({
      component: "TestSystemName",
      "ecs.version": "8.10.0",
      env: "test",
      filename: "test-file",
      labels: {
        envTags: undefined,
      },
      processor: {
        event: "event",
      },
      "log.level": "info",
      logType: "event",
      message: "EVENT: SomeEvent",

      system: "TestSystemName",
      systemEnv: `test-TestSystemName`,
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
      "Custom event message",
      {
        tenantId: 100,
        clientTraceId: "xxx",
        userId: "userId",
        requestTraceId: "RQ-dsfsdf",
        transactionName: "txname",
      }
    )
    const obj = mockTransport.logMessages.pop()
    clean(obj)
    expect(obj).toEqual({
      component: "TestSystemName",
      "ecs.version": "8.10.0",
      env: "test",
      filename: "test-file",
      labels: {
        envTags: undefined,
      },
      "log.level": "info",
      logType: "event",
      message: "Custom event message",
      processor: {
        event: "event",
      },
      system: "TestSystemName",
      systemEnv: `test-TestSystemName`,
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
