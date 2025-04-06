import { Exception } from "../errorHandling/exceptions/Exception"

export const TestUtil = {
  catchErrorAsync: async (callback: () => Promise<any>): Promise<Exception | undefined> => {
    try {
      await callback()
      return undefined
    } catch (error) {
      return error as Exception
    }
  },
  catchError: (callback: () => void): Exception | undefined => {
    try {
      callback()
      return undefined
    } catch (error) {
      return error as Exception
    }
  },
}
