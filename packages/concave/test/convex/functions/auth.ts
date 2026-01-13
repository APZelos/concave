import {Data, Effect as E, Schema as S} from "effect"

import {query, QueryCtx} from "../concave"

export class NotAuthenticatedError extends Data.TaggedError("NotAuthenticatedError") {}

export const getCurrentUser = query({
  args: S.Struct({}),
  handler: E.fn(function* () {
    const {auth} = yield* QueryCtx
    return yield* auth.getUserIdentity()
  }),
})

export const requireAuth = query({
  args: S.Struct({}),
  handler: E.fn(
    function* () {
      const {auth} = yield* QueryCtx
      const identity = yield* auth.getUserIdentity()
      if (!identity) {
        return yield* new NotAuthenticatedError()
      }

      return identity
    },
    // (e) =>
    //   e.pipe(
    //     E.catchTag("NotAuthenticatedError", (error) =>
    //       E.fail(new ConvexError({message: "NotAuthenticatedError", cause: error})),
    //     ),
    //   ),
  ),
})
