import { AsyncContext } from "../../asyncLocalContext/AsyncContext"
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
  //delete obj["context"]
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
  const asyncContext = new AsyncContext(
    {},
    { allowDefaultContextPropertyInitialization: true, allowDefaultContextPropertyInitializationRepeatedly: true }
  )
  const loggerService = new LoggerService(mockConfig, [mockTransport], asyncContext)

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
    expect(actual).toMatchInlineSnapshot(`
      {
        "component": "TestSystemName",
        "ecs.version": "8.10.0",
        "env": "test",
        "filename": "test-file",
        "labels": {
          "envTags": undefined,
        },
        "log.level": "info",
        "logType": "info",
        "message": "SomeMessage",
        "processor": {
          "event": "info",
        },
        "service": {
          "environment": "test",
          "name": "TestSystemName",
        },
        "system": "TestSystemName",
        "systemEnv": "test-TestSystemName",
      }
    `)
  })

  it("should send info correctly 2", () => {
    asyncContext.initProperties({
      clientTraceId: "CT-2342",
      requestTraceId: "RQ-dsfsdf",
      tenant: "tid100",
      transactionName: "txname",
      userId: "userId",
    })
    loggerService.info("test-file", "SomeMessage", { someKey: "someValue" })
    const obj = mockTransport.logMessages.pop()
    clean(obj)
    expect(obj).toMatchInlineSnapshot(`
      {
        "component": "TestSystemName",
        "ecs.version": "8.10.0",
        "env": "test",
        "filename": "test-file",
        "labels": {
          "clientTraceId": "CT-2342",
          "envTags": undefined,
          "requestTraceId": "RQ-dsfsdf",
          "tenant": "tid100",
          "transactionName": "txname",
          "userId": "userId",
        },
        "log.level": "info",
        "logType": "info",
        "message": "SomeMessage { someKey: 'someValue' }",
        "processor": {
          "event": "info",
        },
        "service": {
          "environment": "test",
          "name": "TestSystemName",
        },
        "system": "TestSystemName",
        "systemEnv": "test-TestSystemName",
      }
    `)
  })

  it("should send events correctly", () => {
    asyncContext.initProperties({
      clientTraceId: "CT-2342",
      requestTraceId: "RQ-dsfsdf",
      tenant: "tid100",
      transactionName: "txname",
      userId: "userId",
    })
    loggerService.event(
      "test-file",
      "SomeEvent",
      "Payment",
      "SomeDomain",
      { someKey: "someValue", someKey2: "someValue2" },
      undefined,
      {
        weightKg: 100,
        weighingId: "324234-23423423",
      }
    )
    const obj = mockTransport.logMessages.pop()
    clean(obj)
    expect(obj).toMatchInlineSnapshot(`
      {
        "component": "TestSystemName",
        "ecs.version": "8.10.0",
        "env": "test",
        "event": {
          "category": "Payment",
          "context": {
            "weighingId": "324234-23423423",
            "weightKg": 100,
          },
          "data": {
            "someKey": "someValue",
            "someKey2": "someValue2",
          },
          "domain": "SomeDomain",
          "name": "SomeEvent",
        },
        "filename": "test-file",
        "labels": {
          "clientTraceId": "CT-2342",
          "envTags": undefined,
          "requestTraceId": "RQ-dsfsdf",
          "tenant": "tid100",
          "transactionName": "txname",
          "userId": "userId",
        },
        "log.level": "info",
        "logType": "event",
        "message": "EVENT: SomeEvent Payment SomeDomain",
        "processor": {
          "event": "event",
        },
        "service": {
          "environment": "test",
          "name": "TestSystemName",
        },
        "system": "TestSystemName",
        "systemEnv": "test-TestSystemName",
      }
    `)
    /*expect(obj).toEqual({
      component: "TestSystemName",
      "ecs.version": "8.10.0",
      env: "test",
      event: {
        category: "Payment",
        context: {
          clientTraceId: "xxx",
          requestTraceId: "RQ-dsfsdf",
          tenantId: 100,
          transactionName: "txname",
          userId: "userId",
        },
        data: {
          someKey: "someValue",
        },
        domain: "SomeDomain",
        name: "SomeEvent",
      },
      filename: "test-file",
      labels: {
        envTags: undefined,
      },
      "log.level": "info",
      logType: "event",
      message: "EVENT: SomeEvent Payment SomeDomain",
      processor: {
        event: "event",
      },
      system: "TestSystemName",
      systemEnv: "test-TestSystemName",
    })*/
    /*expect(obj).toEqual({
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
      message: "EVENT: SomeEvent Payment SomeDomain",

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
    })*/
    // Add more assertions as needed
  })

  it("should log an event", () => {
    asyncContext.initProperties({
      clientTraceId: "CT-2342",
      requestTraceId: "RQ-dsfsdf",
      tenant: "tid100",
      transactionName: "txname",
      userId: "userId",
    })
    loggerService.event(
      "test-file",
      "SomeEvent",
      "Payment",
      "Payment",
      { someKey: "someValue" },
      "Custom event message",
      {
        weightKg: 100,
        weighingId: "324234-23423423",
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
        clientTraceId: "CT-2342",
        requestTraceId: "RQ-dsfsdf",
        tenant: "tid100",
        transactionName: "txname",
        userId: "userId",
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
        context: {
          weighingId: "324234-23423423",
          weightKg: 100,
        },
      },
      service: {
        environment: "test",
        name: "TestSystemName",
      },
    })
  })
})
