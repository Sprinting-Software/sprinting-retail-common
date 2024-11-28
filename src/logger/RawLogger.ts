function isEnabled() {
  return process.env.DEBUG_ERROR_HANDLING ? true : false
}
export const RawLogger = {
  isEnabled: isEnabled,
  debug: (...args: Array<any>) => {
    if (isEnabled()) {
      // eslint-disable-next-line no-console
      console.log(...args)
    }
  },
}
