import {customQuery} from "@apzelos/concave-helpers/server/customFunctions"
import {Context, Data, Effect as E, Layer, Schema as S} from "effect"

import {query, QueryCtx} from "../concave"

class SessionContext extends Context.Tag("SessionContext")<
  SessionContext,
  {token: string | null}
>() {}

class UserContext extends Context.Tag("UserContext")<
  UserContext,
  {userId: string; role: string}
>() {}

class TimestampContext extends Context.Tag("TimestampContext")<
  TimestampContext,
  {serverTimestamp: number}
>() {}

export class NotAuthenticatedError extends Data.TaggedError("NotAuthenticatedError")<{
  reason: string
}> {}

export class InputError extends Data.TaggedError("InputError")<{
  message: string
}> {}

export class SessionNotFoundError extends Data.TaggedError("SessionNotFoundError")<{
  token: string
}> {}

export class HandlerError extends Data.TaggedError("HandlerError")<{
  details: string
}> {}

const basicQuery = customQuery(query, {
  QueryCtx,
  args: S.Struct({}),
})

export const customQueryBasic = basicQuery({
  args: S.Struct({}),
  handler: E.fn(function* () {
    return "basic result"
  }),
})

export const customQueryBasicWithArgs = basicQuery({
  args: S.Struct({
    message: S.String,
  }),
  handler: E.fn(function* (args) {
    return `received: ${args.message}`
  }),
})

export const customQueryBasicWithDbAccess = basicQuery({
  args: S.Struct({}),
  handler: E.fn(function* () {
    const {db} = yield* QueryCtx
    const items = yield* db.query("items").take(5)
    return items.map((item) => item.name)
  }),
})

const queryWithExtraArgs = customQuery(query, {
  QueryCtx,
  args: S.Struct({
    optionalToken: S.optional(S.String),
  }),
})

export const customQueryWithExtraArgs = queryWithExtraArgs({
  args: S.Struct({}),
  handler: E.fn(function* () {
    return "extra args accepted"
  }),
})

export const customQueryWithMergedArgs = queryWithExtraArgs({
  args: S.Struct({
    name: S.String,
  }),
  handler: E.fn(function* (args) {
    return `name: ${args.name}`
  }),
})

const queryWithInputAddedArgs = customQuery(query, {
  QueryCtx,
  args: S.Struct({}),
  input: E.fn(function* () {
    return {
      args: {
        serverTimestamp: Date.now(),
        requestId: "req-123",
      } as const,
    }
  }),
})

export const customQueryWithInputAddedArgs = queryWithInputAddedArgs({
  args: S.Struct({}),
  handler: E.fn(function* (args) {
    return {
      serverTimestamp: args.serverTimestamp,
      requestId: args.requestId,
    }
  }),
})

export const customQueryWithInputAndHandlerArgs = queryWithInputAddedArgs({
  args: S.Struct({
    clientData: S.String,
  }),
  handler: E.fn(function* (args) {
    return {
      serverTimestamp: args.serverTimestamp,
      requestId: args.requestId,
      clientData: args.clientData,
    }
  }),
})

const queryWithCustomContext = customQuery(query, {
  QueryCtx,
  args: S.Struct({
    contextValue: S.String,
  }),
  input: E.fn(function* (args) {
    const ctx = yield* QueryCtx
    return {ctx, args: {customValue: args.contextValue.toUpperCase()} as const}
  }),
})

export const customQueryWithCustomContext = queryWithCustomContext({
  args: S.Struct({}),
  handler: E.fn(function* (args) {
    return args.customValue
  }),
})

const queryWithLayer = customQuery(query, {
  QueryCtx,
  args: S.Struct({
    token: S.optional(S.String),
  }),
  input: E.fn(function* (args) {
    const SessionLive = Layer.succeed(SessionContext, {token: args.token ?? null})
    return {layers: [SessionLive]}
  }),
})

export const customQueryWithLayer = queryWithLayer({
  args: S.Struct({}),
  handler: E.fn(function* () {
    const {token} = yield* SessionContext
    return token ?? "no token"
  }),
})

const queryWithMultipleLayers = customQuery(query, {
  QueryCtx,
  args: S.Struct({
    token: S.optional(S.String),
    userId: S.optional(S.String),
    role: S.optional(S.String),
  }),
  input: E.fn(function* (args) {
    const SessionLive = Layer.succeed(SessionContext, {token: args.token ?? null})
    const UserLive = Layer.succeed(UserContext, {
      userId: args.userId ?? "anonymous",
      role: args.role ?? "guest",
    })
    const TimestampLive = Layer.succeed(TimestampContext, {
      serverTimestamp: Date.now(),
    })
    return {layers: [SessionLive, UserLive, TimestampLive]}
  }),
})

export const customQueryWithMultipleLayers = queryWithMultipleLayers({
  args: S.Struct({}),
  handler: E.fn(function* () {
    const {token} = yield* SessionContext
    const {userId, role} = yield* UserContext
    const {serverTimestamp} = yield* TimestampContext
    return {
      token: token ?? "no token",
      userId,
      role,
      hasTimestamp: serverTimestamp > 0,
    }
  }),
})

const queryWithInputError = customQuery(query, {
  QueryCtx,
  args: S.Struct({
    shouldFail: S.Boolean,
  }),
  input: E.fn(function* (args) {
    if (args.shouldFail) {
      return yield* new InputError({message: "Input validation failed"})
    }
    return {}
  }),
})

export const customQueryInputErrorSuccess = queryWithInputError({
  args: S.Struct({}),
  handler: E.fn(function* () {
    return "input succeeded"
  }),
})

export const customQueryInputErrorFail = queryWithInputError({
  args: S.Struct({}),
  handler: E.fn(function* () {
    return "this should not be reached"
  }),
})

const queryWithHandlerError = customQuery(query, {
  QueryCtx,
  args: S.Struct({}),
})

export const customQueryHandlerError = queryWithHandlerError({
  args: S.Struct({
    shouldFail: S.Boolean,
  }),
  handler: E.fn(function* (args) {
    if (args.shouldFail) {
      return yield* new HandlerError({details: "Handler execution failed"})
    }
    return "handler succeeded"
  }),
})

const authenticatedQuery = customQuery(query, {
  QueryCtx,
  args: S.Struct({
    sessionToken: S.optional(S.String),
  }),
  input: E.fn(function* (args) {
    if (!args.sessionToken) {
      return yield* new NotAuthenticatedError({reason: "No session token provided"})
    }

    const {db} = yield* QueryCtx
    const session = yield* db
      .query("sessions")
      .withIndex("by_token", (q) => q.eq("token", args.sessionToken!))
      .unique()

    if (!session) {
      return yield* new SessionNotFoundError({token: args.sessionToken})
    }

    const UserLive = Layer.succeed(UserContext, {
      userId: session.userId,
      role: "authenticated",
    })

    return {
      args: {authenticatedUserId: session.userId} as const,
      layers: [UserLive],
    }
  }),
})

export const customQueryAuthenticated = authenticatedQuery({
  args: S.Struct({}),
  handler: E.fn(function* (args) {
    const {userId, role} = yield* UserContext
    return {
      userId,
      role,
      authenticatedUserId: args.authenticatedUserId,
    }
  }),
})

const complexQuery = customQuery(query, {
  QueryCtx,
  args: S.Struct({
    sessionToken: S.optional(S.String),
    optionalMetadata: S.optional(S.String),
  }),
  input: E.fn(function* (args) {
    const {db} = yield* QueryCtx

    let userId = "anonymous"
    let role = "guest"

    if (args.sessionToken) {
      const session = yield* db
        .query("sessions")
        .withIndex("by_token", (q) => q.eq("token", args.sessionToken!))
        .unique()

      if (session) {
        userId = session.userId
        role = "authenticated"
      }
    }

    const SessionLive = Layer.succeed(SessionContext, {token: args.sessionToken ?? null})
    const UserLive = Layer.succeed(UserContext, {userId, role})
    const TimestampLive = Layer.succeed(TimestampContext, {serverTimestamp: Date.now()})

    return {
      args: {
        requestId: `req-${Date.now()}`,
        metadata: args.optionalMetadata ?? "default",
      } as const,
      layers: [SessionLive, UserLive, TimestampLive],
    }
  }),
})

export const customQueryComplex = complexQuery({
  args: S.Struct({
    queryParam: S.String,
  }),
  handler: E.fn(function* (args) {
    const {token} = yield* SessionContext
    const {userId, role} = yield* UserContext
    const {serverTimestamp} = yield* TimestampContext
    const {db} = yield* QueryCtx

    const itemCount = yield* db
      .query("items")
      .collect()
      .pipe(E.map((items) => items.length))

    return {
      token: token ?? "no token",
      userId,
      role,
      hasTimestamp: serverTimestamp > 0,
      requestId: args.requestId,
      metadata: args.metadata,
      queryParam: args.queryParam,
      itemCount,
    }
  }),
})
