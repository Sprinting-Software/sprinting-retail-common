export const RawLogger = {
  debug: (...args: Array<any>) => {
    if (process.env.DEBUG_ERROR_HANDLING) {
      console.log(...args)
    }
  },
}
