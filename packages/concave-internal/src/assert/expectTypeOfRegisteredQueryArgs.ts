import type {ExpectTypeOf} from "@effect/vitest"
import type {RegisteredQuery} from "convex/server"

import {expectTypeOf} from "@effect/vitest"

type RegisteredQueryArgs<Query> = Query extends RegisteredQuery<any, infer Args, any> ? Args : never

export function expectTypeOfRegisteredQueryArgs<Query extends RegisteredQuery<any, any, any>>(
  _query: Query,
): ExpectTypeOf<RegisteredQueryArgs<typeof _query>, {positive: true}> {
  return expectTypeOf<RegisteredQueryArgs<typeof _query>>()
}
