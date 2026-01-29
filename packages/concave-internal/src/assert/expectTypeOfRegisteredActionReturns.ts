import type {ExpectTypeOf} from "@effect/vitest"
import type {RegisteredAction} from "convex/server"

import {expectTypeOf} from "@effect/vitest"

type RegisteredActionReturns<Action> =
  Action extends RegisteredAction<any, any, infer Returns> ? Returns : never

export function expectTypeOfRegisteredActionReturns<Action extends RegisteredAction<any, any, any>>(
  _action: Action,
): ExpectTypeOf<RegisteredActionReturns<typeof _action>, {positive: true}> {
  return expectTypeOf<RegisteredActionReturns<typeof _action>>()
}
