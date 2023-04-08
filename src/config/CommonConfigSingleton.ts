import { IConfigProvider } from "./IConfigProvider"
import { ClientException } from "../errorHandling/ClientException"

export class CommonConfigSingleton {
  private static config: IConfigProvider
  public static Init(config: IConfigProvider) {
    if (CommonConfigSingleton.config) {
      throw new ClientException(
        "CommonConfigSingletonIsAlreadyInitialized",
        "In any single NodeJS process there should be only one initialization of the configuration."
      )
    }
    CommonConfigSingleton.config = config
  }
  public static GetConfig(): IConfigProvider {
    if (!CommonConfigSingleton.config) {
      throw new ClientException(
        "CommonConfigSingletonIsNotInitialized",
        "The CommonConfigSingleton must be initialized before it can be used."
      )
    }
    return CommonConfigSingleton.config
  }

  public static reset() {
    if (process.env.NODE_ENV !== "test") {
      throw new ClientException(
        "CanOnlyBeCalledFromTests",
        "This method is not intended to be used by any other cases than for running tests."
      )
    }
    CommonConfigSingleton.config = undefined;
  }
}
