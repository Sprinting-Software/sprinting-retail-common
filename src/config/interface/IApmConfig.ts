export type IApmConfig = {
  enableLogs: boolean
  serviceName: string
  serviceNodeName?: string
  apiKey?: string
  serverUrl: string
  secretToken?: string
  verifyServerCert?: boolean
  serverCaCertFile?: string
  serviceVersion?: string
  active?: boolean
  contextPropagationOnly?: boolean
  disableSend?: boolean
  instrument?: boolean
  instrumentIncomingHTTPRequests?: boolean
  contextManager?: string
  transactionIgnoreUrls?: string[]
  ignoreUrls?: string[]
  ignoreUserAgents?: string[]

  errorOnAbortedRequests?: boolean
  abortedErrorThreshold?: number
  frameworkName?: string
  frameworkVersion?: string
  logLevel?: string
  logUncaughtExceptions?: string

  transactionSampleRate?: number
  labels?: Record<string, string>
  captureErrorLogStackTraces?: "messages" | "always" | "never"
  spanStackTraceMinDuration?: string
  usePathAsTransactionName?: boolean
  sourceLinesErrorAppFrames?: number
  sourceLinesErrorLibraryFrames?: number
  sourceLinesSpanAppFrames?: number
  sourceLinesSpanLibraryFrames?: number
  errorMessageMaxLength?: string
  longFieldMaxLength?: number
  stackTraceLimit?: number
  transactionMaxSpans?: number
  maxQueueSize?: number
  apiRequestTime?: string
  apiRequestSize?: string
  serverTimeout?: string
  sanitizeFieldNames?: string[]
  disableInstrumentations?: string[]
  containerId?: string
  metricsLimit?: number
  globalLabels?: Record<string, string>
  configFile?: string
  breakdownMetrics?: boolean
  disableMetrics?: string[]
  cloudProvider?: string
  ignoreMessageQueues?: string
  traceContinuationStrategy?: string
  spanCompressionEnabled?: boolean
  spanCompressionExactMatchMaxDuration?: string
  spanCompressionSameKindMaxDuration?: string
  opentelemetryBridgeEnabled?: boolean
  exitSpanMinDuration?: string
  elasticsearchCaptureBodyUrls?: string[]
  useElasticTraceparentHeader?: boolean
  captureExceptions?: boolean
  centralConfig?: boolean
  metricsInterval?: string
  captureBody?: "off" | "errors" | "transactions" | "all"
  captureHeaders?: boolean
}
