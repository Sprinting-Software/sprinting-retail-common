export const RawLogger = {
  debug: (...args: Array<any>) => {
    if (process.env.DEBUG_ERROR_HANDLING) {
      // eslint-disable-next-line no-console
      console.log(...args)
    }
  },
}
