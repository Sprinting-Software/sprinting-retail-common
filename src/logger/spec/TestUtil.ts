import { LogMessage, LogLevel } from "../types"

export const TestUtil = {
  getLogMessages: (n: number) => {
    const result: LogMessage[] = []
    for (let i = 0; i < n; i++) {
      result.push({
        filename: __filename,
        system: "TestSystem",
        component: "TestComponent",
        env: "production",
        systemEnv: "c",
        logType: LogLevel.event, // Assuming LogLevel is a string-based enum or type
        message: "Testing logging of events",
        event: {
          transactionId: "12345ABC",
          amount: 100.5,
          currency: "USD",
        },
        context: {
          tenant: "tenant123",
          clientTraceId: "trace-00112233",
          userId: "user5678",
          requestTraceId: "req-7890",
          transactionName: "ProcessPayment",
        },
        processor: { event: "log" },
      })
    }
    return result
  },
}
