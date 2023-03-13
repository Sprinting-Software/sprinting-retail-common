import { UnnamedException } from "./UnnamedException"
import { NamedException } from "./NamedException"
import { NamedException500 } from "./NamedException500"
import { CommonHttpException } from "./CommonHttpException"

export const Err = {
  HttpException: CommonHttpException,
  NamedException500: NamedException500,
  NamedException: NamedException,
  UnnamedException: UnnamedException,
}
