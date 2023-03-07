export type UserId = string

export class UserIdContext {
  constructor(public readonly userId: UserId) {}
}
