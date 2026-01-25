import type {ExpectTypeOf} from "@effect/vitest"
import type {RegisteredAction} from "convex/server"

import {expectTypeOf} from "@effect/vitest"

type RegisteredActionArgs<Action> =
  Action extends RegisteredAction<any, infer Args, any> ? Args : never

export function expectTypeOfRegisteredActionArgs<Action extends RegisteredAction<any, any, any>>(
  _action: Action,
): ExpectTypeOf<RegisteredActionArgs<typeof _action>, {positive: true}> {
  return expectTypeOf<RegisteredActionArgs<typeof _action>>()
}
