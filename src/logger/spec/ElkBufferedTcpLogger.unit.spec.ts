import { ElkBufferedTcpLogger } from "../ElkBufferedTcpLogger"
import { ElkRestApi } from "../ElkRestApi"
import { LogMessage } from "../types"
import { jest } from "@jest/globals"
import { TestUtil } from "./TestUtil"

describe("ElkBufferedTcpLogger unittest", () => {
  let elkRestApi: ElkRestApi
  let elkBufferedApi: ElkBufferedTcpLogger

  beforeEach(() => {
    // Mock ElkRestApi
    elkRestApi = new ElkRestApi({ apiKey: "test", endpoint: "test", indexName: "test" })
    jest.spyOn(elkRestApi, "sendManyDocuments").mockResolvedValue(undefined)

    // Create ElkBufferedApi instance with a short buffer interval for testing
    elkBufferedApi = new ElkBufferedTcpLogger(elkRestApi, 1000) // 1 second buffer interval
  })

  afterEach(() => {
    jest.clearAllMocks()
    elkBufferedApi.flushAndStop()
  })

  test("should process logs and send them to ElkRestApi", async () => {
    elkBufferedApi.start()
    const logs: LogMessage[] = TestUtil.getLogMessages(3)

    logs.forEach((log) => elkBufferedApi.sendObject(log))

    // Wait for the buffer interval to trigger the processing
    await new Promise((resolve) => setTimeout(resolve, 1500))

    expect(elkRestApi.sendManyDocuments).toHaveBeenCalledTimes(1)
    expect(elkRestApi.sendManyDocuments).toHaveBeenCalledWith(logs)
  })
  test("should process logs and send them to ElkRestApi variation", async () => {
    elkBufferedApi.start()
    const logs: LogMessage[] = TestUtil.getLogMessages(3)

    logs.forEach((log) => elkBufferedApi.sendObject(log))
    // Wait for the buffer interval to trigger the processing
    await new Promise((resolve) => setTimeout(resolve, 200))

    expect(elkRestApi.sendManyDocuments).toHaveBeenCalledTimes(0)
    // Wait for the buffer interval to trigger the processing
    await new Promise((resolve) => setTimeout(resolve, 1000))

    expect(elkRestApi.sendManyDocuments).toHaveBeenCalledTimes(1)
    expect(elkRestApi.sendManyDocuments).toHaveBeenCalledWith(logs)
  })

  test("should handle log flushing manually", async () => {
    elkBufferedApi.start()
    const logs: LogMessage[] = TestUtil.getLogMessages(10)

    logs.forEach((log) => elkBufferedApi.sendObject(log))

    // Flush and wait for completion
    await elkBufferedApi.flush()

    expect(elkRestApi.sendManyDocuments).toHaveBeenCalledTimes(1)
    expect(elkRestApi.sendManyDocuments).toHaveBeenCalledWith(logs)
  })
  test("should not receive logs when not started", async () => {
    const logs: LogMessage[] = TestUtil.getLogMessages(1)

    logs.forEach((log) => elkBufferedApi.sendObject(log))

    // Flush and wait for completion
    await elkBufferedApi.flush()
    expect(elkRestApi.sendManyDocuments).toHaveBeenCalledTimes(0)
  })
})
