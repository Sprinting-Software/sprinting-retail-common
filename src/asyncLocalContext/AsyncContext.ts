import { AsyncLocalStorage } from "async_hooks"
import { RawLogger } from "../logger/RawLogger"
import { ServerException } from "../errorHandling/exceptions/ServerException"
import { setApmLabelCallback, AsyncContextOptions } from "./types"
import { Global, Injectable } from "@nestjs/common"

@Global()
@Injectable()
export class AsyncContext {
  private als = new AsyncLocalStorage<any>()

  constructor(
    private readonly defaultContext: object | undefined = undefined,
    private readonly options?: AsyncContextOptions,
    private readonly setApmLabel?: setApmLabelCallback
  ) {
    RawLogger.debug("ApplicationAsyncContext initialized with default context", defaultContext)
  }

  /**
   * Internal helper to get the current context.
   * @returns
   */
  private getContext<T extends object>(): T | undefined {
    const ctx = this.als.getStore() || this.defaultContext
    return ctx as T | undefined
  }

  private hasAsyncLocalStorage(): boolean {
    return this.als.getStore() !== undefined
  }
  /**
   * Returns the current context. If the context is not available, it throws an error.
   * The returned context is a frozen clone of the original context to prevent accidental mutations.
   * @returns
   */
  public getContextOrFail<T extends object>(): T {
    const ctx = this.getContext<T>()
    if (!ctx) {
      throw new ServerException(
        "CannotAccessContextYet",
        "Most probably this is a logical programming error. The context is not available yet."
      )
    }
    const clone = { ...ctx }
    return Object.freeze(clone) as T
  }

  public getContextOrUndefined<T extends object>(): T | undefined {
    const ctx = this.getContext<T>()
    if (!ctx) {
      return undefined
    }
    const clone = { ...ctx }
    return Object.freeze(clone) as T
  }

  public getPropertyOrFail<T>(propertyName: string): T {
    const result = this.getPropertyOrUndefined<T>(propertyName)
    if (!result) {
      throw new ServerException(
        "AsyncContextPropertyNotFound",
        `A property was not found in the current async context.`,
        { propertyName, context: this.getContextOrUndefined() }
      )
    }

    return result
  }

  public getPropertyOrUndefined<T>(propertyName: string) {
    const ctx = this.getContext()
    if (!ctx) {
      throw new ServerException(
        "AsyncContextNotAvailable",
        "While trying to access a property, the async context was not defined. Most probably this is a logical programming error. The context is not available yet.",
        { propertyName }
      )
    }
    return ctx[propertyName] as T
  }

  /**
   * Adds a new property to the context. If the property already exists, it throws an error as it is supposed to happen once only.
   * @param propertyName
   * @param value
   */
  public initProperty<K extends string, V>(propertyName: K, value: V, skipSettingsAsApmLabels?: boolean): void {
    if (!this.hasAsyncLocalStorage() && this.defaultContext === undefined) {
      throw new ServerException(
        "AsyncLocalStorageNorDefaultContextIsAvailable",
        "You are trying to initialize a property for the context while neither the async local storage nor the default context has been setup. This is not valid. Most probably this is a logical programming error.",
        { propertyName, value }
      )
    }
    if (!this.hasAsyncLocalStorage() && !this.options?.allowDefaultContextPropertyInitialization) {
      throw new ServerException(
        "AsyncLocalStorageNotAvailable",
        "The async local storage has not been setup. You are currently running against the default context. Most probably this is a logical programming error. You are trying to initialize a property in the async context and it is not valid until the point where the async local storage has been initialized.",
        { propertyName, value, defaultContext: this.defaultContext }
      )
    }
    if (value === undefined || value === null) {
      throw new ServerException("AsyncContextMustInitProperly", "The property value is not defined.", {
        propertyName,
        value,
      })
    }
    let ctx = this.als.getStore()
    let isDefaultContextUsed = false
    if (!ctx) {
      if (this.options?.allowDefaultContextPropertyInitialization) {
        // It is ok to override properties in the default context
        // Should only happen during test automation
        ctx = this.defaultContext
        isDefaultContextUsed = true
      } else {
        throw new ServerException(
          "AsyncLocalNoContextAvailable",
          "No context available while trying to assign a property to the async local context",
          { propertyName, value }
        )
      }
    }
    if (propertyName in ctx) {
      if (isDefaultContextUsed && this.options?.allowDefaultContextPropertyInitializationRepeatedly) {
        // It is ok to override properties in the default context
        // Should only happen during test automation
      } else {
        throw new ServerException(
          "AsyncLocalPropertyAlreadyExists",
          "Trying to assign a property that already exists in the async local context. The async local context is supposed to be immutable after the initial assignment.",
          {
            propertyName,
            value,
            existingValue: ctx[propertyName],
          }
        )
      }
    }
    ctx[propertyName] = value
    if (this.setApmLabel && !skipSettingsAsApmLabels) {
      this.setApmLabel(propertyName, value)
    }
  }

  /**
   * Adds multiple properties to the context. If any of the properties already exists, it throws an error as the context
   * is supposed to be immutable after the initial assignment.
   * @param values
   */
  public initProperties(values: Record<string, any>, skipSettingsAsApmLabels?: boolean): void {
    for (const [key, value] of Object.entries(values)) {
      this.initProperty(key, value, skipSettingsAsApmLabels)
    }
  }

  public runWithContextSync<T extends object>(systemContext: T, callback: () => void): void {
    this.addTraceContextMany(systemContext)
    this.als.run(systemContext, callback)
  }

  private addTraceContextMany(systemContext: any) {
    if (this.setApmLabel) {
      // run through the fields and add to the trace context
      for (const [key, value] of Object.entries(systemContext)) {
        try {
          this.setApmLabel(key, value)
        } catch (err) {
          RawLogger.error("Failed to add trace context", { key, value, error: err })
        }
      }
    }
  }

  public runWithContextMergedSync<T extends object>(systemContext: T, callback: () => void): void {
    const currentCtx = this.getContext() || {}
    const mergedContext = { ...currentCtx, ...systemContext }
    this.addTraceContextMany(mergedContext)
    this.als.run(mergedContext, callback)
  }

  public async runWithContext<T extends object>(systemContext: T, callback: () => Promise<void>): Promise<void> {
    this.addTraceContextMany(systemContext)
    return new Promise((resolve, reject) => {
      this.als.run(systemContext, () => {
        callback()
          .then(() => resolve())
          .catch((err) => reject(err))
      })
    })
  }
  public async runWithContextMerged<T extends object>(systemContext: T, callback: () => Promise<void>): Promise<void> {
    const currentCtx = this.getContext() || {}
    const mergedContext = { ...currentCtx, ...systemContext }
    this.addTraceContextMany(mergedContext)
    return new Promise((resolve, reject) => {
      this.als.run(mergedContext, () => {
        callback()
          .then(() => resolve())
          .catch((err) => reject(err))
      })
    })
  }
}
