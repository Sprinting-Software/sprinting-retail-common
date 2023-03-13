import { AppException } from "./AppException"

export class DbError extends AppException {
  public operationName: string
  public args: any[]

  constructor(operationName: string, args: any[] = []) {
    super(500, `Database operation ${operationName} failed`)
    this.operationName = operationName
    this.args = args
    Object.setPrototypeOf(this, DbError.prototype)
  }
}
