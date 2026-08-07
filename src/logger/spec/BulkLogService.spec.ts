import { ElkV9BulkConfig } from "../../config/interface/LibConfig"
import { BulkLogService } from "../BulkLogService"

const config: ElkV9BulkConfig = {
  endpoint: "http://elasticsearch:9200/",
  apiKey: "secret",
  dataStream: "logs-my-service-prod",
  flushIntervalMs: 60000,
}

describe("BulkLogService", () => {
  let fetchMock: jest.SpyInstance

  beforeEach(() => {
    fetchMock = jest
      .spyOn(global, "fetch")
      .mockResolvedValue({ ok: true, status: 200, json: async () => ({ errors: false }) } as Response)
  })

  afterEach(() => {
    fetchMock.mockRestore()
    jest.useRealTimers()
  })

  it("posts newline-terminated data-stream NDJSON with the API key", async () => {
    const service = new BulkLogService({ ...config, maxBatchSize: 2 })
    service.log({ message: "hello", "@timestamp": "now" })
    service.log({ message: "world" })

    await service.flush()

    expect(fetchMock).toHaveBeenCalledWith("http://elasticsearch:9200/_bulk", {
      method: "POST",
      headers: { "Content-Type": "application/x-ndjson", Authorization: "ApiKey secret" },
      body: '{"create":{"_index":"logs-my-service-prod"}}\n{"message":"hello","@timestamp":"now"}\n{"create":{"_index":"logs-my-service-prod"}}\n{"message":"world"}\n',
    })
    await service.onModuleDestroy()
  })

  it("drops the oldest log when the buffer is full", async () => {
    const errorSpy = jest.spyOn(console, "log").mockImplementation()
    const service = new BulkLogService({ ...config, maxBatchSize: 3, maxBufferSize: 2 })
    service.log({ message: "old" })
    service.log({ message: "newer" })
    service.log({ message: "newest" })

    await service.flush()

    expect(fetchMock.mock.calls[0][1].body).not.toContain('"old"')
    expect(fetchMock.mock.calls[0][1].body).toContain('"newer"')
    expect(fetchMock.mock.calls[0][1].body).toContain('"newest"')
    expect(errorSpy).toHaveBeenCalledWith("ELK v9 fallback log", { message: "old" })
    await service.onModuleDestroy()
    errorSpy.mockRestore()
  })

  it("retries only a failed network request", async () => {
    jest.useFakeTimers()
    fetchMock
      .mockRejectedValueOnce(new Error("offline"))
      .mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({}) } as Response)
    const service = new BulkLogService({ ...config, maxRetries: 1 })
    service.log({ message: "retry" })
    const flushing = service.flush()

    await jest.advanceTimersByTimeAsync(500)
    await flushing

    expect(fetchMock).toHaveBeenCalledTimes(2)
    await service.onModuleDestroy()
  })

  it("retries 5xx responses", async () => {
    jest.useFakeTimers()
    fetchMock
      .mockResolvedValueOnce({ ok: false, status: 503, text: async () => "" } as Response)
      .mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({ errors: false }) } as Response)
    const service = new BulkLogService({ ...config, maxRetries: 1 })
    service.log({ message: "retry" })
    const flushing = service.flush()

    await jest.advanceTimersByTimeAsync(500)
    await flushing

    expect(fetchMock).toHaveBeenCalledTimes(2)
    await service.onModuleDestroy()
  })

  it("falls back partial bulk failures without retrying successful items", async () => {
    const errorSpy = jest.spyOn(console, "log").mockImplementation()
    fetchMock.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ errors: true, items: [{ create: { status: 201 } }, { create: { status: 400 } }] }),
    } as Response)
    const service = new BulkLogService(config)
    service.log({ message: "sent" })
    service.log({ message: "failed" })

    await service.flush()

    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(errorSpy).toHaveBeenCalledWith("ELK v9 fallback log", { message: "failed" })
    errorSpy.mockRestore()
    await service.onModuleDestroy()
  })

  it("falls back after the final retry", async () => {
    jest.useFakeTimers()
    const errorSpy = jest.spyOn(console, "log").mockImplementation()
    fetchMock.mockRejectedValue(new Error("offline"))
    const service = new BulkLogService({ ...config, maxRetries: 1 })
    service.log({ message: "fallback" })
    const flushing = service.flush()

    await jest.advanceTimersByTimeAsync(500)
    await flushing

    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(errorSpy).toHaveBeenCalledWith("ELK v9 fallback log", { message: "fallback" })
    await service.onModuleDestroy()
    errorSpy.mockRestore()
  })

  it("does not retry 4xx responses", async () => {
    const errorSpy = jest.spyOn(console, "log").mockImplementation()
    fetchMock.mockResolvedValueOnce({ ok: false, status: 401, text: async () => "" } as Response)
    const service = new BulkLogService(config)
    service.log({ message: "unauthorized" })

    await service.flush()

    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(errorSpy).toHaveBeenCalledWith("ELK v9 fallback log", { message: "unauthorized" })
    await service.onModuleDestroy()
    errorSpy.mockRestore()
  })

  it("flushes on the configured interval", async () => {
    jest.useFakeTimers()
    const service = new BulkLogService({ ...config, flushIntervalMs: 1000 })
    service.log({ message: "interval" })

    await jest.advanceTimersByTimeAsync(1000)

    expect(fetchMock).toHaveBeenCalledTimes(1)
    await service.onModuleDestroy()
  })

  it("falls back logs that cannot be serialized", async () => {
    const errorSpy = jest.spyOn(console, "log").mockImplementation()
    const service = new BulkLogService(config)
    const circular: Record<string, any> = { message: "circular" }
    circular.self = circular
    service.log(circular)

    await service.flush()

    expect(fetchMock).not.toHaveBeenCalled()
    expect(errorSpy).toHaveBeenCalledWith("ELK v9 fallback log", circular)
    await service.onModuleDestroy()
    errorSpy.mockRestore()
  })

  it("drains buffered logs on module destruction", async () => {
    const service = new BulkLogService({ ...config, maxBatchSize: 2 })
    for (let index = 0; index < 5; index++) service.log({ index })

    await service.onModuleDestroy()

    expect(fetchMock).toHaveBeenCalledTimes(3)
  })
})
