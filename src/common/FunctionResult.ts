/**
 * Represents the outcome of a function call.
 * If the function returns no data, use: FunctionResult<undefined, 'ErrorA' | 'ErrorB'>
 * If it returns data, use: FunctionResult<DataType, 'ErrorA' | 'ErrorB'>
 * If it's always successful, just use the raw data type.
 */
export type FunctionResult<T = undefined, Status extends string = string> = T extends undefined
  ? { status?: Status }
  : { status?: Status; data: T }
