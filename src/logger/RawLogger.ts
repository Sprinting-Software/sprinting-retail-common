const IS_DEBUG_ENABLED =
  process.env.DEBUG_ERROR_HANDLING === "true" || process.env.DEBUG_LOGGING === "true" ? true : false

export const RawLogger = {
  isEnabled: () => IS_DEBUG_ENABLED,
  debug: (...args: Array<any>) => {
    if (IS_DEBUG_ENABLED) {
      // eslint-disable-next-line no-console
      console.log(...args)
    }
  },
  error: (...args: Array<any>) => {
    // eslint-disable-next-line no-console
    console.error("***********************************************************************")
    // eslint-disable-next-line no-console
    console.error("UNEXPECTED LIBRARY ERROR HAPPENED: ", ...args)
    // eslint-disable-next-line no-console
    console.error("***********************************************************************")
  },
}
