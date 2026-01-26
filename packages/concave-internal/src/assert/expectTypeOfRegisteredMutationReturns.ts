import type {ExpectTypeOf} from "@effect/vitest"
import type {RegisteredMutation} from "convex/server"

import {expectTypeOf} from "@effect/vitest"

type RegisteredMutationReturns<Mutation> =
  Mutation extends RegisteredMutation<any, any, infer Returns> ? Returns : never

export function expectTypeOfRegisteredMutationReturns<
  Mutation extends RegisteredMutation<any, any, any>,
>(
  _mutation: Mutation,
): ExpectTypeOf<RegisteredMutationReturns<typeof _mutation>, {positive: true}> {
  return expectTypeOf<RegisteredMutationReturns<typeof _mutation>>()
}
