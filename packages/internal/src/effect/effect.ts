import type {ForceNullUnion} from "../types"

import {Effect as E} from "effect"

export function fromNullableOrFail<FailError>(onFail: () => FailError) {
  function map<A>(a: ForceNullUnion<A>): E.Effect<NonNullable<A>, FailError> {
    if (a === null) {
      return E.fail(onFail())
    }

    return E.succeed(a as NonNullable<A>)
  }

  return map
}
