export interface IExceptionAsHttpResponse {
  errorName: string;
  contextData?: Record<string, any>;
  description?: string;
  innerError?: any;
}
