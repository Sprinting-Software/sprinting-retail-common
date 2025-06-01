import { AsyncLocalStorage } from "async_hooks"

export class ApplicationAsyncContext {
  private als = new AsyncLocalStorage<any>()

  public getContext<T extends object>(): T | undefined {
    return this.als.getStore() as T | undefined
  }

  public async runWithContext<T extends object>(systemContext: T, callback: () => Promise<void>): Promise<void> {
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
    return new Promise((resolve, reject) => {
      this.als.run(mergedContext, () => {
        callback()
          .then(() => resolve())
          .catch((err) => reject(err))
      })
    })
  }
}
