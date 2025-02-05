let truncationLimit = 8445 // Max message length for UDP
export const ExceptionConst = {
  getTruncationLimitForExceptions: function () {
    return truncationLimit
  },
  overrideTruncationLimitForExceptions: function (limit: number) {
    truncationLimit = limit
  },
}
