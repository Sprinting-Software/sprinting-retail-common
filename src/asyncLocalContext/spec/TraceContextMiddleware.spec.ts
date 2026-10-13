import { AsyncContext } from "../AsyncContext"
import { TraceContextMiddleware } from "../TraceContextMiddleware"

describe("TraceContextMiddleware", () => {
  const run = (headers: Record<string, string>) => {
    const properties: Record<string, unknown> = {}
    const context = {
      initProperties: (values: Record<string, unknown>) => Object.assign(properties, values),
    } as unknown as AsyncContext
    const next = jest.fn()
    const req = { headers: { host: "api.example", ...headers }, protocol: "https", originalUrl: "/api/x" }

    new TraceContextMiddleware(context).use(req as any, {} as any, next)

    expect(next).toHaveBeenCalled()
    return properties
  }

  it.each(["x-clienttraceid", "x-client-traceid"])("reads clientTraceId from %s", (header) => {
    expect(run({ [header]: "C6U4I8K" })).toEqual(expect.objectContaining({ clientTraceId: "C6U4I8K" }))
  })

  it("reads the other client headers", () => {
    expect(
      run({
        "x-clientappcommithash": "abc123",
        "x-clientappversion": "v1.1",
        "x-clientdomain": "http://localhost:3003",
        "x-clientinmemoryid": "C77U6DK",
        "x-clientloginsessionid": "C7MNK6B",
        "x-clientroute": "/admin/orders/day",
      })
    ).toEqual(
      expect.objectContaining({
        clientAppCommitHash: "abc123",
        clientAppVersion: "v1.1",
        clientDomain: "http://localhost:3003",
        clientInMemoryId: "C77U6DK",
        clientLoginSessionId: "C7MNK6B",
        clientRoute: "/admin/orders/day",
      })
    )
  })
})
