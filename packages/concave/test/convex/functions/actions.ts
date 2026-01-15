import type {Id} from "../_generated/dataModel"

import {Data, Effect as E, Schema as S} from "effect"

import {internal} from "../_generated/api"
import {action, ActionCtx, internalAction} from "../concave"

export class NotAuthenticatedError extends Data.TaggedError("NotAuthenticatedError") {}

export class ActionTaggedError extends Data.TaggedError("ActionTaggedError")<{
  message: string
}> {}

export class FetchTaggedError extends Data.TaggedError("FetchTaggedError")<{
  message: string
  cause?: unknown
}> {}

export const actionNoArgs = action({
  args: S.Struct({}),
  handler: E.fn(function* () {
    return "action no args result"
  }),
})

export const actionNoArgsWithReturns = action({
  args: S.Struct({}),
  returns: S.String,
  handler: E.fn(function* () {
    return "validated action return"
  }),
})

export const actionWithArgs = action({
  args: S.Struct({
    name: S.String,
    count: S.Number,
  }),
  handler: E.fn(function* (args) {
    return `action: ${args.name}: ${args.count}`
  }),
})

export const actionWithArgsWithReturns = action({
  args: S.Struct({
    value: S.Number,
  }),
  returns: S.Struct({
    quadrupled: S.Number,
    original: S.Number,
  }),
  handler: E.fn(function* (args) {
    return {
      quadrupled: args.value * 4,
      original: args.value,
    }
  }),
})

export const actionNoAuthRequired = action({
  args: S.Struct({}),
  handler: E.fn(function* () {
    return "public action"
  }),
})

export const actionAuthRequired = action({
  args: S.Struct({}),
  handler: E.fn(function* () {
    const {auth} = yield* ActionCtx
    const identity = yield* auth.getUserIdentity()
    if (!identity) {
      return yield* new NotAuthenticatedError()
    }
    return {
      tokenIdentifier: identity.tokenIdentifier,
      name: identity.name,
    }
  }),
})

export const actionGetIdentity = action({
  args: S.Struct({}),
  handler: E.fn(function* () {
    const {auth} = yield* ActionCtx
    return yield* auth.getUserIdentity()
  }),
})

export const actionThrowsTaggedError = action({
  args: S.Struct({
    message: S.String,
  }),
  handler: E.fn(function* (args) {
    return yield* new ActionTaggedError({message: args.message})
  }),
})

export const actionThrowsRegularError = action({
  args: S.Struct({
    message: S.String,
  }),
  handler: E.fn(function* (args) {
    throw new Error(args.message)
  }),
})

export const actionCallsQuery = action({
  args: S.Struct({
    value: S.Number,
  }),
  handler: E.fn(function* (args) {
    const ctx = yield* ActionCtx
    const Eresult: E.Effect<string> = ctx.runQuery(
      internal.functions.queries.internalQueryWithArgs,
      {
        value: args.value,
      },
    )
    const result = yield* Eresult
    return `action called query: ${result}`
  }),
})

export const actionCallsMutation = action({
  args: S.Struct({
    name: S.String,
  }),
  handler: E.fn(function* (args) {
    const ctx = yield* ActionCtx
    const Eid: E.Effect<Id<"items">> = ctx.runMutation(
      internal.functions.mutations.internalMutationInsert,
      {
        name: args.name,
      },
    )
    return yield* Eid
  }),
})

export const actionCallsAction = action({
  args: S.Struct({
    value: S.Number,
  }),
  handler: E.fn(function* (args) {
    const ctx = yield* ActionCtx
    const Eresult: E.Effect<string> = ctx.runAction(
      internal.functions.actions.internalActionWithArgs,
      {
        value: args.value,
      },
    )
    const result = yield* Eresult
    return `action called action: ${result}`
  }),
})

export const actionFetchExternal = action({
  args: S.Struct({
    url: S.String,
  }),
  handler: E.fn(function* (args) {
    const response = yield* E.tryPromise({
      try: async () => fetch(args.url),
      catch: (error) => new FetchTaggedError({message: "Fetch failed", cause: error}),
    })
    return {
      status: response.status,
      ok: response.ok,
    }
  }),
})

export const internalActionNoArgs = internalAction({
  args: S.Struct({}),
  handler: E.fn(function* () {
    return "internal action no args"
  }),
})

export const internalActionWithArgs = internalAction({
  args: S.Struct({
    value: S.Number,
  }),
  handler: E.fn(function* (args) {
    return `internal action: ${args.value * 4}`
  }),
})
