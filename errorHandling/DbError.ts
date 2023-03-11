import { AppError } from "./AppErrors"

export class DbError extends AppError {
  public operationName: string
  public args: any[]

  constructor(operationName: string, args: any[] = []) {
    super(500, `Database operation ${operationName} failed`)
    this.operationName = operationName
    this.args = args
    Object.setPrototypeOf(this, DbError.prototype)
  }
}
