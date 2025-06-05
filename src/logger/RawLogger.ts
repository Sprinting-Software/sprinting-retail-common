function isEnabled() {
  return process.env.DEBUG_ERROR_HANDLING === "true" ? true : false
}
export const RawLogger = {
  isEnabled: isEnabled,
  debug: (...args: Array<any>) => {
    if (isEnabled()) {
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
