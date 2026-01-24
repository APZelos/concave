import type {ExpectTypeOf} from "@effect/vitest"
import type {RegisteredMutation} from "convex/server"

import {expectTypeOf} from "@effect/vitest"

type RegisteredMutationArgs<Mutation> =
  Mutation extends RegisteredMutation<any, infer Args, any> ? Args : never

export function expectTypeOfRegisteredMutationArgs<
  Mutation extends RegisteredMutation<any, any, any>,
>(_mutation: Mutation): ExpectTypeOf<RegisteredMutationArgs<typeof _mutation>, {positive: true}> {
  return expectTypeOf<RegisteredMutationArgs<typeof _mutation>>()
}
