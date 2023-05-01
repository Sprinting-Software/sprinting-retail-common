import { ExceptionUtil } from "../errorHandling/ExceptionUtil"
import { AssertionException } from "../errorHandling/exceptions/AssertionException"
import { IExceptionJson } from "../errorHandling/IExceptionJson"

export class RetailTestUtil {
  /**
   * Takes any function that is expected to throw an error, catches the error and returns it as a plain json for
   * build test assertions.
   * If no error is thrown, an AssertionException is returned as plain json so that you are sure to handle the situation
   * where error handling does not happen as expected.
   * @param fct
   */
  public static catchAndReturnAsJson(fct: () => void) {
    try {
      fct()
      return ExceptionUtil.toPlainJsonForSpec(
        new AssertionException(
          "An exception should have been thrown at this point. There must be a coding error somewhere. "
        )
      )
    } catch (e) {
      return ExceptionUtil.toPlainJsonForSpec(e)
    }
  }

  /**
   * Same as catchAndReturnAsJson, only for async functions.
   * @param fct
   */
  public static async catchAndReturnAsJsonAsync(fct: () => Promise<void>): Promise<IExceptionJson> {
    try {
      await fct()
      return ExceptionUtil.toPlainJsonForSpec(
        new AssertionException(
          "An exception should have been thrown at this point. There must be a coding error somewhere. "
        )
      )
    } catch (e) {
      return ExceptionUtil.toPlainJsonForSpec(e)
    }
  }
}

/**
 * A short alias for ExceptionUtil.catchAndReturnAsJson
 */
export function CatchSync(fct: () => void) {
  return RetailTestUtil.catchAndReturnAsJson(fct)
}

/**
 * A short alias for ExceptionUtil.catchAndReturnAsJsonAsync
 */
export async function CatchAsync(fct: () => Promise<void>) {
  return await RetailTestUtil.catchAndReturnAsJsonAsync(fct)
}
