import type {ExpectTypeOf} from "@effect/vitest"
import type {RegisteredQuery} from "convex/server"

import {expectTypeOf} from "@effect/vitest"

type RegisteredQueryReturns<Query> =
  Query extends RegisteredQuery<any, any, infer Returns> ? Returns : never

export function expectTypeOfRegisteredQueryReturns<Query extends RegisteredQuery<any, any, any>>(
  _query: Query,
): ExpectTypeOf<RegisteredQueryReturns<typeof _query>, {positive: true}> {
  return expectTypeOf<RegisteredQueryReturns<typeof _query>>()
}
