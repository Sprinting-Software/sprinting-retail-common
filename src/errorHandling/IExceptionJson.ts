export interface IExceptionJson {
  errorName: string
  description?: string
  contextData?: Record<string, any>
  httpStatus?: number
  errorTraceId?: string
  innerError?: IExceptionJson
}
