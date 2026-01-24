/* eslint-disable @typescript-eslint/no-empty-object-type */
import type {
  GenericDatabaseReader as ConvexGenericDatabaseReader,
  GenericQueryCtx as ConvexGenericQueryCtx,
  DataModelFromSchemaDefinition,
  DocumentByName,
  GenericDataModel,
  TableNamesInDataModel,
} from "convex/server"
import type {GenericId} from "convex/values"

import {
  expectTypeOfRegisteredMutationArgs,
  expectTypeOfRegisteredMutationReturns,
  expectTypeOfRegisteredQueryArgs,
  expectTypeOfRegisteredQueryReturns,
} from "@apzelos/concave-internal/assert"
import {fromNullableOrFail} from "@apzelos/concave-internal/effect"
import {
  createActionCtx,
  createMutationCtx,
  createQueryCtx,
  createServerFunctions,
  DocNotFoundError,
  GenericDatabaseReader,
  GenericQueryCtx,
  SDocId,
} from "@apzelos/concave/server"
import {describe, expectTypeOf, test} from "@effect/vitest"
import {defineSchema, defineTable} from "convex/server"
import {v} from "convex/values"
import {Context, Effect as E, Layer, Schema as S} from "effect"

import {customMutation, customQuery} from "./customFunctions"

const _schema = defineSchema({
  users: defineTable({
    name: v.string(),
    email: v.string(),
    role: v.union(v.literal("admin"), v.literal("user")),
  }),
  sessions: defineTable({
    token: v.string(),
    userId: v.id("users"),
    expiresAt: v.number(),
  })
    .index("by_token", ["token"])
    .index("by_user_id", ["userId"]),
})

type Schema = typeof _schema
type DataModel = DataModelFromSchemaDefinition<Schema>

const QueryCtx = createQueryCtx<DataModel>()
const MutationCtx = createMutationCtx<DataModel>()
const ActionCtx = createActionCtx<DataModel>()

const {
  query: queryBuilder,
  internalQuery: internalQueryBuilder,
  mutation: mutationBuilder,
  internalMutation: internalMutationBuilder,
} = createServerFunctions({
  QueryCtx,
  MutationCtx,
  ActionCtx,
})

class SessionContext extends Context.Tag("SessionContext")<
  SessionContext,
  {sessionId?: GenericId<"sessions">}
>() {}

class AuthenticatedUserContext extends Context.Tag("AuthenticatedUserContext")<
  AuthenticatedUserContext,
  {userId: GenericId<"users">}
>() {}

class MyGenericDatabaseReader<
  DataModel extends GenericDataModel,
> extends GenericDatabaseReader<DataModel> {
  constructor(convexDb: ConvexGenericDatabaseReader<DataModel>) {
    super(convexDb)
  }

  override get<TableName extends TableNamesInDataModel<DataModel>>(
    _id: GenericId<TableName>,
  ): E.Effect<DocumentByName<DataModel, TableName> | null, never, never> {
    console.log("get not allowed")
    // eslint-disable-next-line @typescript-eslint/require-await
    return E.promise(async () => null)
  }
}

class MyGenericQueryCtx<DataModel extends GenericDataModel> extends GenericQueryCtx<DataModel> {
  constructor(convexQueryCtx: ConvexGenericQueryCtx<DataModel>) {
    super(convexQueryCtx)
    this.db = new MyGenericDatabaseReader(convexQueryCtx.db)
  }
}

describe("customQuery", () => {
  describe("query", () => {
    test('should create query without any "overrides"', () => {
      const query = customQuery(queryBuilder, {
        QueryCtx,
        args: S.Struct({}),
        input: E.fn(function* (args) {
          expectTypeOf(args).toEqualTypeOf<{}>()
          return {}
        }),
      })

      const queryWithNoArgs = query({
        args: S.Struct({}),
        handler: E.fn(function* (args) {
          expectTypeOf(args).toEqualTypeOf<{}>()
          return 1
        }),
      })

      expectTypeOfRegisteredQueryArgs(queryWithNoArgs).toEqualTypeOf<{}>()
      expectTypeOfRegisteredQueryReturns(queryWithNoArgs).toEqualTypeOf<Promise<number>>()

      const queryWithArgs = query({
        args: S.Struct({message: S.String}),
        handler: E.fn(function* (args) {
          expectTypeOf(args).toEqualTypeOf<{readonly message: string}>()
          return "a value"
        }),
      })

      expectTypeOfRegisteredQueryArgs(queryWithArgs).toEqualTypeOf<{message: string}>()
      expectTypeOfRegisteredQueryReturns(queryWithArgs).toEqualTypeOf<Promise<string>>()

      const queryWithReturns = query({
        args: S.Struct({}),
        returns: S.NumberFromString,
        handler: E.fn(function* (args) {
          expectTypeOf(args).toEqualTypeOf<{}>()
          return "a value"
        }),
      })

      expectTypeOfRegisteredQueryArgs(queryWithReturns).toEqualTypeOf<{}>()
      expectTypeOfRegisteredQueryReturns(queryWithReturns).toEqualTypeOf<Promise<number>>()
    })

    test("should accept args", () => {
      const query = customQuery(queryBuilder, {
        QueryCtx,
        args: S.Struct({
          sessionId: S.optional(S.String),
          date: S.DateFromString,
        }),
        input: E.fn(function* (args) {
          expectTypeOf(args).toEqualTypeOf<{
            readonly sessionId?: string
            readonly date: Date
          }>()
          return {}
        }),
      })

      const queryWithNoArgs = query({
        args: S.Struct({}),
        handler: E.fn(function* (args) {
          expectTypeOf(args).toEqualTypeOf<{}>()
          return 1
        }),
      })

      expectTypeOfRegisteredQueryArgs(queryWithNoArgs).toEqualTypeOf<{
        sessionId?: string | undefined
        date: string
      }>()
      expectTypeOfRegisteredQueryReturns(queryWithNoArgs).toEqualTypeOf<Promise<number>>()

      const queryWithArgs = query({
        args: S.Struct({message: S.String}),
        handler: E.fn(function* (args) {
          expectTypeOf(args).toEqualTypeOf<{readonly message: string}>()
          return "a value"
        }),
      })

      expectTypeOfRegisteredQueryArgs(queryWithArgs).toEqualTypeOf<{
        sessionId?: string | undefined
        date: string
        message: string
      }>()
      expectTypeOfRegisteredQueryReturns(queryWithArgs).toEqualTypeOf<Promise<string>>()

      const queryWithReturns = query({
        args: S.Struct({}),
        returns: S.NumberFromString,
        handler: E.fn(function* (args) {
          expectTypeOf(args).toEqualTypeOf<{}>()
          return "a value"
        }),
      })

      expectTypeOfRegisteredQueryArgs(queryWithReturns).toEqualTypeOf<{
        sessionId?: string | undefined
        date: string
      }>()
      expectTypeOfRegisteredQueryReturns(queryWithReturns).toEqualTypeOf<Promise<number>>()
    })

    test("should add args", () => {
      const query = customQuery(queryBuilder, {
        QueryCtx,
        args: S.Struct({}),
        input: E.fn(function* (args) {
          expectTypeOf(args).toEqualTypeOf<{}>()
          return {args: {timestamp: Date.now()} as const}
        }),
      })

      const queryWithNoArgs = query({
        args: S.Struct({}),
        handler: E.fn(function* (args) {
          expectTypeOf(args).toEqualTypeOf<{readonly timestamp: number}>()
          return 1
        }),
      })

      expectTypeOfRegisteredQueryArgs(queryWithNoArgs).toEqualTypeOf<{}>()
      expectTypeOfRegisteredQueryReturns(queryWithNoArgs).toEqualTypeOf<Promise<number>>()

      const queryWithArgs = query({
        args: S.Struct({message: S.String}),
        handler: E.fn(function* (args) {
          expectTypeOf(args).toEqualTypeOf<{
            readonly timestamp: number
            readonly message: string
          }>()
          return "a value"
        }),
      })

      expectTypeOfRegisteredQueryArgs(queryWithArgs).toEqualTypeOf<{message: string}>()
      expectTypeOfRegisteredQueryReturns(queryWithArgs).toEqualTypeOf<Promise<string>>()

      const queryWithRedeclaredArgs = query({
        args: S.Struct({timestamp: S.Number}),
        handler: E.fn(function* (args) {
          expectTypeOf(args).toEqualTypeOf<{readonly timestamp: number}>()
          return "a value"
        }),
      })

      expectTypeOfRegisteredQueryArgs(queryWithRedeclaredArgs).toEqualTypeOf<{timestamp: number}>()
      expectTypeOfRegisteredQueryReturns(queryWithRedeclaredArgs).toEqualTypeOf<Promise<string>>()

      const queryWithReturns = query({
        args: S.Struct({}),
        returns: S.NumberFromString,
        handler: E.fn(function* (args) {
          expectTypeOf(args).toEqualTypeOf<{readonly timestamp: number}>()
          return "a value"
        }),
      })

      expectTypeOfRegisteredQueryArgs(queryWithReturns).toEqualTypeOf<{}>()
      expectTypeOfRegisteredQueryReturns(queryWithReturns).toEqualTypeOf<Promise<number>>()
    })

    test("should intersect types when handler redeclares arg with incompatible primitive type", () => {
      const query = customQuery(queryBuilder, {
        QueryCtx,
        args: S.Struct({}),
        input: E.fn(function* () {
          return {args: {timestamp: Date.now()} as const}
        }),
      })

      // When handler redeclares an arg with an incompatible primitive type,
      // TypeScript collapses the intersection to `never` (e.g., number & string = never)
      query({
        args: S.Struct({timestamp: S.String}),
        handler: E.fn(function* (args) {
          expectTypeOf(args.timestamp).toEqualTypeOf<never>()
          return "a value"
        }),
      })

      // Note: For complex types like S.Struct, TypeScript does NOT collapse to never.
      // e.g., number & {foo: string} remains as an impossible-but-not-never type.
      // This is a TypeScript limitation, not a bug in the implementation.
    })

    test("should provide modified ctx", () => {
      const query = customQuery(queryBuilder, {
        QueryCtx,
        args: S.Struct({}),
        input: E.fn(function* (args) {
          expectTypeOf(args).toEqualTypeOf<{}>()
          const ctx = yield* QueryCtx
          return {ctx: new GenericQueryCtx(ctx.convexQueryCtx)}
        }),
      })

      const queryWithNoArgs = query({
        args: S.Struct({}),
        handler: E.fn(function* (args) {
          expectTypeOf(args).toEqualTypeOf<{}>()
          const {db} = yield* QueryCtx
          return yield* db
            .query("sessions")
            .first()
            .pipe(E.map((session) => session?._id))
        }),
      })

      expectTypeOfRegisteredQueryArgs(queryWithNoArgs).toEqualTypeOf<{}>()
      expectTypeOfRegisteredQueryReturns(queryWithNoArgs).toEqualTypeOf<
        Promise<GenericId<"sessions"> | undefined>
      >()

      const queryWithArgs = query({
        args: S.Struct({message: S.String}),
        handler: E.fn(function* (args) {
          expectTypeOf(args).toEqualTypeOf<{readonly message: string}>()
          const {db} = yield* QueryCtx
          return yield* db
            .query("sessions")
            .first()
            .pipe(E.map((session) => session?._id))
        }),
      })

      expectTypeOfRegisteredQueryArgs(queryWithArgs).toEqualTypeOf<{message: string}>()
      expectTypeOfRegisteredQueryReturns(queryWithArgs).toEqualTypeOf<
        Promise<GenericId<"sessions"> | undefined>
      >()

      const queryWithReturns = query({
        args: S.Struct({}),
        returns: S.UndefinedOr(SDocId("sessions")),
        handler: E.fn(function* (args) {
          expectTypeOf(args).toEqualTypeOf<{}>()
          const {db} = yield* QueryCtx
          return yield* db
            .query("sessions")
            .first()
            .pipe(E.map((session) => session?._id))
        }),
      })

      expectTypeOfRegisteredQueryArgs(queryWithReturns).toEqualTypeOf<{}>()
      expectTypeOfRegisteredQueryReturns(queryWithReturns).toEqualTypeOf<
        Promise<GenericId<"sessions"> | undefined>
      >()
    })

    test("should provide additional layers", () => {
      const query = customQuery(queryBuilder, {
        QueryCtx,
        args: S.Struct({}),
        input: E.fn(function* (args) {
          expectTypeOf(args).toEqualTypeOf<{}>()
          const ctx = yield* QueryCtx
          const id = yield* ctx.auth.getUserIdentity()
          const session = yield* ctx.db
            .query("sessions")
            .withIndex("by_token", (q) => q.eq("token", id?.subject ?? ""))
            .unique()
          const SessionLive = Layer.succeed(SessionContext, {sessionId: session?._id})
          return {layers: [SessionLive]}
        }),
      })

      const queryWithNoArgs = query({
        args: S.Struct({}),
        handler: E.fn(function* (args) {
          expectTypeOf(args).toEqualTypeOf<{}>()
          const {db} = yield* QueryCtx
          const {sessionId} = yield* SessionContext
          if (sessionId) {
            return yield* db.get(sessionId).pipe(E.map((session) => session?.userId ?? null))
          }
          return null
        }),
      })

      expectTypeOfRegisteredQueryArgs(queryWithNoArgs).toEqualTypeOf<{}>()
      expectTypeOfRegisteredQueryReturns(queryWithNoArgs).toEqualTypeOf<
        Promise<GenericId<"users"> | null>
      >()

      const queryWithArgs = query({
        args: S.Struct({message: S.String}),
        handler: E.fn(function* (args) {
          expectTypeOf(args).toEqualTypeOf<{readonly message: string}>()
          const {db} = yield* QueryCtx
          const {sessionId} = yield* SessionContext
          if (sessionId) {
            return yield* db.get(sessionId).pipe(E.map((session) => session?.userId ?? null))
          }
          return null
        }),
      })

      expectTypeOfRegisteredQueryArgs(queryWithArgs).toEqualTypeOf<{message: string}>()
      expectTypeOfRegisteredQueryReturns(queryWithArgs).toEqualTypeOf<
        Promise<GenericId<"users"> | null>
      >()

      const queryWithReturns = query({
        args: S.Struct({}),
        returns: S.NullOr(SDocId("users")),
        handler: E.fn(function* (args) {
          expectTypeOf(args).toEqualTypeOf<{}>()
          const {db} = yield* QueryCtx
          const {sessionId} = yield* SessionContext
          if (sessionId) {
            return yield* db.get(sessionId).pipe(E.map((session) => session?.userId ?? null))
          }
          return null
        }),
      })

      expectTypeOfRegisteredQueryArgs(queryWithReturns).toEqualTypeOf<{}>()
      expectTypeOfRegisteredQueryReturns(queryWithReturns).toEqualTypeOf<
        Promise<GenericId<"users"> | null>
      >()
    })
  })

  describe("internalQuery", () => {
    test('should create internalQuery without any "overrides"', () => {
      const internalQuery = customQuery(internalQueryBuilder, {
        QueryCtx,
        args: S.Struct({}),
        input: E.fn(function* (args) {
          expectTypeOf(args).toEqualTypeOf<{}>()
          return {}
        }),
      })

      const internalQueryWithNoArgs = internalQuery({
        args: S.Struct({}),
        handler: E.fn(function* (args) {
          expectTypeOf(args).toEqualTypeOf<{}>()
          return 1
        }),
      })

      expectTypeOfRegisteredQueryArgs(internalQueryWithNoArgs).toEqualTypeOf<{}>()
      expectTypeOfRegisteredQueryReturns(internalQueryWithNoArgs).toEqualTypeOf<Promise<number>>()

      const internalQueryWithArgs = internalQuery({
        args: S.Struct({message: S.String}),
        handler: E.fn(function* (args) {
          expectTypeOf(args).toEqualTypeOf<{readonly message: string}>()
          return "a value"
        }),
      })

      expectTypeOfRegisteredQueryArgs(internalQueryWithArgs).toEqualTypeOf<{message: string}>()
      expectTypeOfRegisteredQueryReturns(internalQueryWithArgs).toEqualTypeOf<Promise<string>>()

      const internalQueryWithReturns = internalQuery({
        args: S.Struct({}),
        returns: S.NumberFromString,
        handler: E.fn(function* (args) {
          expectTypeOf(args).toEqualTypeOf<{}>()
          return "a value"
        }),
      })

      expectTypeOfRegisteredQueryArgs(internalQueryWithReturns).toEqualTypeOf<{}>()
      expectTypeOfRegisteredQueryReturns(internalQueryWithReturns).toEqualTypeOf<Promise<number>>()
    })

    test("should accept args", () => {
      const internalQuery = customQuery(internalQueryBuilder, {
        QueryCtx,
        args: S.Struct({
          sessionId: S.optional(S.String),
          date: S.DateFromString,
        }),
        input: E.fn(function* (args) {
          expectTypeOf(args).toEqualTypeOf<{
            readonly sessionId?: string
            readonly date: Date
          }>()
          return {}
        }),
      })

      const internalQueryWithNoArgs = internalQuery({
        args: S.Struct({}),
        handler: E.fn(function* (args) {
          expectTypeOf(args).toEqualTypeOf<{}>()
          return 1
        }),
      })

      expectTypeOfRegisteredQueryArgs(internalQueryWithNoArgs).toEqualTypeOf<{
        sessionId?: string | undefined
        date: string
      }>()
      expectTypeOfRegisteredQueryReturns(internalQueryWithNoArgs).toEqualTypeOf<Promise<number>>()

      const internalQueryWithArgs = internalQuery({
        args: S.Struct({message: S.String}),
        handler: E.fn(function* (args) {
          expectTypeOf(args).toEqualTypeOf<{readonly message: string}>()
          return "a value"
        }),
      })

      expectTypeOfRegisteredQueryArgs(internalQueryWithArgs).toEqualTypeOf<{
        sessionId?: string | undefined
        date: string
        message: string
      }>()
      expectTypeOfRegisteredQueryReturns(internalQueryWithArgs).toEqualTypeOf<Promise<string>>()

      const internalQueryWithReturns = internalQuery({
        args: S.Struct({}),
        returns: S.NumberFromString,
        handler: E.fn(function* (args) {
          expectTypeOf(args).toEqualTypeOf<{}>()
          return "a value"
        }),
      })

      expectTypeOfRegisteredQueryArgs(internalQueryWithReturns).toEqualTypeOf<{
        sessionId?: string | undefined
        date: string
      }>()
      expectTypeOfRegisteredQueryReturns(internalQueryWithReturns).toEqualTypeOf<Promise<number>>()
    })

    test("should add args", () => {
      const internalQuery = customQuery(internalQueryBuilder, {
        QueryCtx,
        args: S.Struct({}),
        input: E.fn(function* (args) {
          expectTypeOf(args).toEqualTypeOf<{}>()
          return {args: {timestamp: Date.now()} as const}
        }),
      })

      const internalQueryWithNoArgs = internalQuery({
        args: S.Struct({}),
        handler: E.fn(function* (args) {
          expectTypeOf(args).toEqualTypeOf<{readonly timestamp: number}>()
          return 1
        }),
      })

      expectTypeOfRegisteredQueryArgs(internalQueryWithNoArgs).toEqualTypeOf<{}>()
      expectTypeOfRegisteredQueryReturns(internalQueryWithNoArgs).toEqualTypeOf<Promise<number>>()

      const internalQueryWithArgs = internalQuery({
        args: S.Struct({message: S.String}),
        handler: E.fn(function* (args) {
          expectTypeOf(args).toEqualTypeOf<{
            readonly timestamp: number
            readonly message: string
          }>()
          return "a value"
        }),
      })

      expectTypeOfRegisteredQueryArgs(internalQueryWithArgs).toEqualTypeOf<{message: string}>()
      expectTypeOfRegisteredQueryReturns(internalQueryWithArgs).toEqualTypeOf<Promise<string>>()

      const internalQueryWithRedeclaredArgs = internalQuery({
        args: S.Struct({timestamp: S.Number}),
        handler: E.fn(function* (args) {
          expectTypeOf(args).toEqualTypeOf<{readonly timestamp: number}>()
          return "a value"
        }),
      })

      expectTypeOfRegisteredQueryArgs(internalQueryWithRedeclaredArgs).toEqualTypeOf<{
        timestamp: number
      }>()
      expectTypeOfRegisteredQueryReturns(internalQueryWithRedeclaredArgs).toEqualTypeOf<
        Promise<string>
      >()

      const internalQueryWithReturns = internalQuery({
        args: S.Struct({}),
        returns: S.NumberFromString,
        handler: E.fn(function* (args) {
          expectTypeOf(args).toEqualTypeOf<{readonly timestamp: number}>()
          return "a value"
        }),
      })

      expectTypeOfRegisteredQueryArgs(internalQueryWithReturns).toEqualTypeOf<{}>()
      expectTypeOfRegisteredQueryReturns(internalQueryWithReturns).toEqualTypeOf<Promise<number>>()
    })

    test("should provide modified ctx", () => {
      const internalQuery = customQuery(internalQueryBuilder, {
        QueryCtx,
        args: S.Struct({}),
        input: E.fn(function* (args) {
          expectTypeOf(args).toEqualTypeOf<{}>()
          const ctx = yield* QueryCtx
          return {ctx: new GenericQueryCtx(ctx.convexQueryCtx)}
        }),
      })

      const internalQueryWithNoArgs = internalQuery({
        args: S.Struct({}),
        handler: E.fn(function* (args) {
          expectTypeOf(args).toEqualTypeOf<{}>()
          const {db} = yield* QueryCtx
          return yield* db
            .query("sessions")
            .first()
            .pipe(E.map((session) => session?._id))
        }),
      })

      expectTypeOfRegisteredQueryArgs(internalQueryWithNoArgs).toEqualTypeOf<{}>()
      expectTypeOfRegisteredQueryReturns(internalQueryWithNoArgs).toEqualTypeOf<
        Promise<GenericId<"sessions"> | undefined>
      >()

      const internalQueryWithArgs = internalQuery({
        args: S.Struct({message: S.String}),
        handler: E.fn(function* (args) {
          expectTypeOf(args).toEqualTypeOf<{readonly message: string}>()
          const {db} = yield* QueryCtx
          return yield* db
            .query("sessions")
            .first()
            .pipe(E.map((session) => session?._id))
        }),
      })

      expectTypeOfRegisteredQueryArgs(internalQueryWithArgs).toEqualTypeOf<{message: string}>()
      expectTypeOfRegisteredQueryReturns(internalQueryWithArgs).toEqualTypeOf<
        Promise<GenericId<"sessions"> | undefined>
      >()

      const internalQueryWithReturns = internalQuery({
        args: S.Struct({}),
        returns: S.UndefinedOr(SDocId("sessions")),
        handler: E.fn(function* (args) {
          expectTypeOf(args).toEqualTypeOf<{}>()
          const {db} = yield* QueryCtx
          return yield* db
            .query("sessions")
            .first()
            .pipe(E.map((session) => session?._id))
        }),
      })

      expectTypeOfRegisteredQueryArgs(internalQueryWithReturns).toEqualTypeOf<{}>()
      expectTypeOfRegisteredQueryReturns(internalQueryWithReturns).toEqualTypeOf<
        Promise<GenericId<"sessions"> | undefined>
      >()
    })

    test("should provide additional layers", () => {
      const internalQuery = customQuery(internalQueryBuilder, {
        QueryCtx,
        args: S.Struct({}),
        input: E.fn(function* (args) {
          expectTypeOf(args).toEqualTypeOf<{}>()
          const ctx = yield* QueryCtx
          const id = yield* ctx.auth.getUserIdentity()
          const session = yield* ctx.db
            .query("sessions")
            .withIndex("by_token", (q) => q.eq("token", id?.subject ?? ""))
            .unique()
          const SessionLive = Layer.succeed(SessionContext, {sessionId: session?._id})
          return {layers: [SessionLive]}
        }),
      })

      const internalQueryWithNoArgs = internalQuery({
        args: S.Struct({}),
        handler: E.fn(function* (args) {
          expectTypeOf(args).toEqualTypeOf<{}>()
          const {db} = yield* QueryCtx
          const {sessionId} = yield* SessionContext
          if (sessionId) {
            return yield* db.get(sessionId).pipe(E.map((session) => session?.userId ?? null))
          }
          return null
        }),
      })

      expectTypeOfRegisteredQueryArgs(internalQueryWithNoArgs).toEqualTypeOf<{}>()
      expectTypeOfRegisteredQueryReturns(internalQueryWithNoArgs).toEqualTypeOf<
        Promise<GenericId<"users"> | null>
      >()

      const internalQueryWithArgs = internalQuery({
        args: S.Struct({message: S.String}),
        handler: E.fn(function* (args) {
          expectTypeOf(args).toEqualTypeOf<{readonly message: string}>()
          const {db} = yield* QueryCtx
          const {sessionId} = yield* SessionContext
          if (sessionId) {
            return yield* db.get(sessionId).pipe(E.map((session) => session?.userId ?? null))
          }
          return null
        }),
      })

      expectTypeOfRegisteredQueryArgs(internalQueryWithArgs).toEqualTypeOf<{message: string}>()
      expectTypeOfRegisteredQueryReturns(internalQueryWithArgs).toEqualTypeOf<
        Promise<GenericId<"users"> | null>
      >()

      const internalQueryWithReturns = internalQuery({
        args: S.Struct({}),
        returns: S.NullOr(SDocId("users")),
        handler: E.fn(function* (args) {
          expectTypeOf(args).toEqualTypeOf<{}>()
          const {db} = yield* QueryCtx
          const {sessionId} = yield* SessionContext
          if (sessionId) {
            return yield* db.get(sessionId).pipe(E.map((session) => session?.userId ?? null))
          }
          return null
        }),
      })

      expectTypeOfRegisteredQueryArgs(internalQueryWithReturns).toEqualTypeOf<{}>()
      expectTypeOfRegisteredQueryReturns(internalQueryWithReturns).toEqualTypeOf<
        Promise<GenericId<"users"> | null>
      >()
    })
  })

  describe("complex cases", () => {
    test("provide everything", () => {
      const query = customQuery(queryBuilder, {
        QueryCtx,
        args: S.Struct({sessionId: S.optional(SDocId("sessions"))}),
        input: E.fn(function* (args) {
          expectTypeOf(args).toEqualTypeOf<{readonly sessionId?: GenericId<"sessions">}>()

          const ctx = yield* QueryCtx
          const SessionLive = Layer.succeed(SessionContext, {sessionId: args.sessionId})
          const AuthenticatedUserIdLive = Layer.effect(
            AuthenticatedUserContext,
            E.gen(function* () {
              const {sessionId} = yield* SessionContext
              const session = yield* ctx.db
                .query("sessions")
                .withIndex("by_id", (q) => q.eq("_id", sessionId!))
                .unique()

              if (!session) {
                return yield* new DocNotFoundError({
                  tableName: "sessions",
                  metadata: {sessionId: args.sessionId},
                })
              }

              return {userId: session.userId}
            }),
          ).pipe(Layer.provide(SessionLive))

          return {
            ctx: new MyGenericQueryCtx(ctx.convexQueryCtx),
            args: {
              timestamp: Date.now(),
            } as const,
            layers: [SessionLive, AuthenticatedUserIdLive],
          }
        }),
      })

      const queryWithNoArgs = query({
        args: S.Struct({}),
        handler: E.fn(function* (args) {
          expectTypeOf(args).toEqualTypeOf<{readonly timestamp: number}>()
          const {db} = yield* QueryCtx
          const {sessionId} = yield* SessionContext
          const {userId} = yield* AuthenticatedUserContext
          const user = yield* db
            .get(userId)
            .pipe(
              E.andThen(
                fromNullableOrFail(
                  () => new DocNotFoundError({tableName: "users", metadata: {userId}}),
                ),
              ),
            )

          const session = yield* db
            .query("sessions")
            .withIndex("by_user_id", (q) => q.eq("userId", user._id))
            .unique()
            .pipe(
              E.andThen(
                fromNullableOrFail(
                  () => new DocNotFoundError({tableName: "sessions", metadata: {userId: user._id}}),
                ),
              ),
            )

          if (session?._id != sessionId) {
            return null
          }

          return session.token
        }),
      })

      expectTypeOfRegisteredQueryArgs(queryWithNoArgs).toEqualTypeOf<{
        sessionId?: GenericId<"sessions">
      }>()
      expectTypeOfRegisteredQueryReturns(queryWithNoArgs).toEqualTypeOf<Promise<string | null>>()

      const queryWithArgs = query({
        args: S.Struct({message: S.String}),
        handler: E.fn(function* (args) {
          expectTypeOf(args).toEqualTypeOf<{readonly timestamp: number; readonly message: string}>()
          const {db} = yield* QueryCtx
          const {sessionId} = yield* SessionContext
          const {userId} = yield* AuthenticatedUserContext
          const user = yield* db
            .get(userId)
            .pipe(
              E.andThen(
                fromNullableOrFail(
                  () => new DocNotFoundError({tableName: "users", metadata: {userId}}),
                ),
              ),
            )

          const session = yield* db
            .query("sessions")
            .withIndex("by_user_id", (q) => q.eq("userId", user._id))
            .unique()
            .pipe(
              E.andThen(
                fromNullableOrFail(
                  () => new DocNotFoundError({tableName: "sessions", metadata: {userId: user._id}}),
                ),
              ),
            )

          if (session?._id != sessionId) {
            return null
          }

          return session.token
        }),
      })

      expectTypeOfRegisteredQueryArgs(queryWithArgs).toEqualTypeOf<{
        sessionId?: GenericId<"sessions">
        message: string
      }>()
      expectTypeOfRegisteredQueryReturns(queryWithArgs).toEqualTypeOf<Promise<string | null>>()

      const queryWithReturns = query({
        args: S.Struct({}),
        returns: S.NullOr(S.String),
        handler: E.fn(function* (args) {
          expectTypeOf(args).toEqualTypeOf<{readonly timestamp: number}>()
          const {db} = yield* QueryCtx
          const {sessionId} = yield* SessionContext
          const {userId} = yield* AuthenticatedUserContext
          const user = yield* db
            .get(userId)
            .pipe(
              E.andThen(
                fromNullableOrFail(
                  () => new DocNotFoundError({tableName: "users", metadata: {userId}}),
                ),
              ),
            )

          const session = yield* db
            .query("sessions")
            .withIndex("by_user_id", (q) => q.eq("userId", user._id))
            .unique()
            .pipe(
              E.andThen(
                fromNullableOrFail(
                  () => new DocNotFoundError({tableName: "sessions", metadata: {userId: user._id}}),
                ),
              ),
            )

          if (session?._id != sessionId) {
            return null
          }

          return session.token
        }),
      })

      expectTypeOfRegisteredQueryArgs(queryWithReturns).toEqualTypeOf<{
        sessionId?: GenericId<"sessions">
      }>()
      expectTypeOfRegisteredQueryReturns(queryWithReturns).toEqualTypeOf<Promise<string | null>>()
    })
  })
})

describe("customMutation", () => {
  describe("mutation", () => {
    test('should create mutation without any "overrides"', () => {
      const mutation = customMutation(mutationBuilder, {
        QueryCtx,
        MutationCtx,
        args: S.Struct({}),
        input: E.fn(function* (args) {
          expectTypeOf(args).toEqualTypeOf<{}>()
          return {}
        }),
      })

      const mutationWithNoArgs = mutation({
        args: S.Struct({}),
        handler: E.fn(function* (args) {
          expectTypeOf(args).toEqualTypeOf<{}>()
          return 1
        }),
      })

      expectTypeOfRegisteredMutationArgs(mutationWithNoArgs).toEqualTypeOf<{}>()
      expectTypeOfRegisteredMutationReturns(mutationWithNoArgs).toEqualTypeOf<Promise<number>>()

      const mutationWithArgs = mutation({
        args: S.Struct({message: S.String}),
        handler: E.fn(function* (args) {
          expectTypeOf(args).toEqualTypeOf<{readonly message: string}>()
          return "a value"
        }),
      })

      expectTypeOfRegisteredMutationArgs(mutationWithArgs).toEqualTypeOf<{message: string}>()
      expectTypeOfRegisteredMutationReturns(mutationWithArgs).toEqualTypeOf<Promise<string>>()

      const mutationWithReturns = mutation({
        args: S.Struct({}),
        returns: S.NumberFromString,
        handler: E.fn(function* (args) {
          expectTypeOf(args).toEqualTypeOf<{}>()
          return "a value"
        }),
      })

      expectTypeOfRegisteredMutationArgs(mutationWithReturns).toEqualTypeOf<{}>()
      expectTypeOfRegisteredMutationReturns(mutationWithReturns).toEqualTypeOf<Promise<number>>()
    })

    test("should accept args", () => {
      const mutation = customMutation(mutationBuilder, {
        QueryCtx,
        MutationCtx,
        args: S.Struct({
          sessionId: S.optional(S.String),
          date: S.DateFromString,
        }),
        input: E.fn(function* (args) {
          expectTypeOf(args).toEqualTypeOf<{
            readonly sessionId?: string
            readonly date: Date
          }>()
          return {}
        }),
      })

      const mutationWithNoArgs = mutation({
        args: S.Struct({}),
        handler: E.fn(function* (args) {
          expectTypeOf(args).toEqualTypeOf<{}>()
          return 1
        }),
      })

      expectTypeOfRegisteredMutationArgs(mutationWithNoArgs).toEqualTypeOf<{
        sessionId?: string | undefined
        date: string
      }>()
      expectTypeOfRegisteredMutationReturns(mutationWithNoArgs).toEqualTypeOf<Promise<number>>()

      const mutationWithArgs = mutation({
        args: S.Struct({message: S.String}),
        handler: E.fn(function* (args) {
          expectTypeOf(args).toEqualTypeOf<{readonly message: string}>()
          return "a value"
        }),
      })

      expectTypeOfRegisteredMutationArgs(mutationWithArgs).toEqualTypeOf<{
        sessionId?: string | undefined
        date: string
        message: string
      }>()
      expectTypeOfRegisteredMutationReturns(mutationWithArgs).toEqualTypeOf<Promise<string>>()

      const mutationWithReturns = mutation({
        args: S.Struct({}),
        returns: S.NumberFromString,
        handler: E.fn(function* (args) {
          expectTypeOf(args).toEqualTypeOf<{}>()
          return "a value"
        }),
      })

      expectTypeOfRegisteredMutationArgs(mutationWithReturns).toEqualTypeOf<{
        sessionId?: string | undefined
        date: string
      }>()
      expectTypeOfRegisteredMutationReturns(mutationWithReturns).toEqualTypeOf<Promise<number>>()
    })

    test("should add args", () => {
      const mutation = customMutation(mutationBuilder, {
        QueryCtx,
        MutationCtx,
        args: S.Struct({}),
        input: E.fn(function* (args) {
          expectTypeOf(args).toEqualTypeOf<{}>()
          return {args: {timestamp: Date.now()} as const}
        }),
      })

      const mutationWithNoArgs = mutation({
        args: S.Struct({}),
        handler: E.fn(function* (args) {
          expectTypeOf(args).toEqualTypeOf<{readonly timestamp: number}>()
          return 1
        }),
      })

      expectTypeOfRegisteredMutationArgs(mutationWithNoArgs).toEqualTypeOf<{}>()
      expectTypeOfRegisteredMutationReturns(mutationWithNoArgs).toEqualTypeOf<Promise<number>>()

      const mutationWithArgs = mutation({
        args: S.Struct({message: S.String}),
        handler: E.fn(function* (args) {
          expectTypeOf(args).toEqualTypeOf<{
            readonly timestamp: number
            readonly message: string
          }>()
          return "a value"
        }),
      })

      expectTypeOfRegisteredMutationArgs(mutationWithArgs).toEqualTypeOf<{message: string}>()
      expectTypeOfRegisteredMutationReturns(mutationWithArgs).toEqualTypeOf<Promise<string>>()

      const mutationWithRedeclaredArgs = mutation({
        args: S.Struct({timestamp: S.Number}),
        handler: E.fn(function* (args) {
          expectTypeOf(args).toEqualTypeOf<{readonly timestamp: number}>()
          return "a value"
        }),
      })

      expectTypeOfRegisteredMutationArgs(mutationWithRedeclaredArgs).toEqualTypeOf<{
        timestamp: number
      }>()
      expectTypeOfRegisteredMutationReturns(mutationWithRedeclaredArgs).toEqualTypeOf<
        Promise<string>
      >()

      const mutationWithReturns = mutation({
        args: S.Struct({}),
        returns: S.NumberFromString,
        handler: E.fn(function* (args) {
          expectTypeOf(args).toEqualTypeOf<{readonly timestamp: number}>()
          return "a value"
        }),
      })

      expectTypeOfRegisteredMutationArgs(mutationWithReturns).toEqualTypeOf<{}>()
      expectTypeOfRegisteredMutationReturns(mutationWithReturns).toEqualTypeOf<Promise<number>>()
    })

    test("should provide both QueryCtx and MutationCtx in handler", () => {
      const mutation = customMutation(mutationBuilder, {
        QueryCtx,
        MutationCtx,
        args: S.Struct({}),
        input: E.fn(function* () {
          return {}
        }),
      })

      const mutationWithDbAccess = mutation({
        args: S.Struct({}),
        handler: E.fn(function* (args) {
          expectTypeOf(args).toEqualTypeOf<{}>()
          const {db: queryDb} = yield* QueryCtx
          const sessions = yield* queryDb.query("sessions").collect()
          const {db: mutationDb} = yield* MutationCtx
          const id = yield* mutationDb.insert("sessions", {
            token: "new-token",
            userId: sessions[0]?._creationTime.toString() as GenericId<"users">,
            expiresAt: Date.now(),
          })
          return id
        }),
      })

      expectTypeOfRegisteredMutationArgs(mutationWithDbAccess).toEqualTypeOf<{}>()
      expectTypeOfRegisteredMutationReturns(mutationWithDbAccess).toEqualTypeOf<
        Promise<GenericId<"sessions">>
      >()
    })

    test("should provide MutationCtx in input function", () => {
      const mutation = customMutation(mutationBuilder, {
        QueryCtx,
        MutationCtx,
        args: S.Struct({token: S.String}),
        input: E.fn(function* (args) {
          expectTypeOf(args).toEqualTypeOf<{readonly token: string}>()
          const {db} = yield* MutationCtx
          const session = yield* db
            .query("sessions")
            .withIndex("by_token", (q) => q.eq("token", args.token))
            .unique()
          const SessionLive = Layer.succeed(SessionContext, {sessionId: session?._id})
          return {layers: [SessionLive]}
        }),
      })

      const mutationWithInputCtx = mutation({
        args: S.Struct({}),
        handler: E.fn(function* (args) {
          expectTypeOf(args).toEqualTypeOf<{}>()
          const {sessionId} = yield* SessionContext
          return sessionId ?? null
        }),
      })

      expectTypeOfRegisteredMutationArgs(mutationWithInputCtx).toEqualTypeOf<{token: string}>()
      expectTypeOfRegisteredMutationReturns(mutationWithInputCtx).toEqualTypeOf<
        Promise<GenericId<"sessions"> | null>
      >()
    })

    test("should provide additional layers", () => {
      const mutation = customMutation(mutationBuilder, {
        QueryCtx,
        MutationCtx,
        args: S.Struct({}),
        input: E.fn(function* (args) {
          expectTypeOf(args).toEqualTypeOf<{}>()
          const ctx = yield* MutationCtx
          const id = yield* ctx.auth.getUserIdentity()
          const session = yield* ctx.db
            .query("sessions")
            .withIndex("by_token", (q) => q.eq("token", id?.subject ?? ""))
            .unique()
          const SessionLive = Layer.succeed(SessionContext, {sessionId: session?._id})
          return {layers: [SessionLive]}
        }),
      })

      const mutationWithNoArgs = mutation({
        args: S.Struct({}),
        handler: E.fn(function* (args) {
          expectTypeOf(args).toEqualTypeOf<{}>()
          const {db} = yield* MutationCtx
          const {sessionId} = yield* SessionContext
          if (sessionId) {
            return yield* db.get(sessionId).pipe(E.map((session) => session?.userId ?? null))
          }
          return null
        }),
      })

      expectTypeOfRegisteredMutationArgs(mutationWithNoArgs).toEqualTypeOf<{}>()
      expectTypeOfRegisteredMutationReturns(mutationWithNoArgs).toEqualTypeOf<
        Promise<GenericId<"users"> | null>
      >()

      const mutationWithArgs = mutation({
        args: S.Struct({message: S.String}),
        handler: E.fn(function* (args) {
          expectTypeOf(args).toEqualTypeOf<{readonly message: string}>()
          const {db} = yield* MutationCtx
          const {sessionId} = yield* SessionContext
          if (sessionId) {
            return yield* db.get(sessionId).pipe(E.map((session) => session?.userId ?? null))
          }
          return null
        }),
      })

      expectTypeOfRegisteredMutationArgs(mutationWithArgs).toEqualTypeOf<{message: string}>()
      expectTypeOfRegisteredMutationReturns(mutationWithArgs).toEqualTypeOf<
        Promise<GenericId<"users"> | null>
      >()

      const mutationWithReturns = mutation({
        args: S.Struct({}),
        returns: S.NullOr(SDocId("users")),
        handler: E.fn(function* (args) {
          expectTypeOf(args).toEqualTypeOf<{}>()
          const {db} = yield* MutationCtx
          const {sessionId} = yield* SessionContext
          if (sessionId) {
            return yield* db.get(sessionId).pipe(E.map((session) => session?.userId ?? null))
          }
          return null
        }),
      })

      expectTypeOfRegisteredMutationArgs(mutationWithReturns).toEqualTypeOf<{}>()
      expectTypeOfRegisteredMutationReturns(mutationWithReturns).toEqualTypeOf<
        Promise<GenericId<"users"> | null>
      >()
    })
  })

  describe("internalMutation", () => {
    test('should create internalMutation without any "overrides"', () => {
      const internalMutation = customMutation(internalMutationBuilder, {
        QueryCtx,
        MutationCtx,
        args: S.Struct({}),
        input: E.fn(function* (args) {
          expectTypeOf(args).toEqualTypeOf<{}>()
          return {}
        }),
      })

      const internalMutationWithNoArgs = internalMutation({
        args: S.Struct({}),
        handler: E.fn(function* (args) {
          expectTypeOf(args).toEqualTypeOf<{}>()
          return 1
        }),
      })

      expectTypeOfRegisteredMutationArgs(internalMutationWithNoArgs).toEqualTypeOf<{}>()
      expectTypeOfRegisteredMutationReturns(internalMutationWithNoArgs).toEqualTypeOf<
        Promise<number>
      >()

      const internalMutationWithArgs = internalMutation({
        args: S.Struct({message: S.String}),
        handler: E.fn(function* (args) {
          expectTypeOf(args).toEqualTypeOf<{readonly message: string}>()
          return "a value"
        }),
      })

      expectTypeOfRegisteredMutationArgs(internalMutationWithArgs).toEqualTypeOf<{
        message: string
      }>()
      expectTypeOfRegisteredMutationReturns(internalMutationWithArgs).toEqualTypeOf<
        Promise<string>
      >()

      const internalMutationWithReturns = internalMutation({
        args: S.Struct({}),
        returns: S.NumberFromString,
        handler: E.fn(function* (args) {
          expectTypeOf(args).toEqualTypeOf<{}>()
          return "a value"
        }),
      })

      expectTypeOfRegisteredMutationArgs(internalMutationWithReturns).toEqualTypeOf<{}>()
      expectTypeOfRegisteredMutationReturns(internalMutationWithReturns).toEqualTypeOf<
        Promise<number>
      >()
    })

    test("should accept args", () => {
      const internalMutation = customMutation(internalMutationBuilder, {
        QueryCtx,
        MutationCtx,
        args: S.Struct({
          sessionId: S.optional(S.String),
          date: S.DateFromString,
        }),
        input: E.fn(function* (args) {
          expectTypeOf(args).toEqualTypeOf<{
            readonly sessionId?: string
            readonly date: Date
          }>()
          return {}
        }),
      })

      const internalMutationWithNoArgs = internalMutation({
        args: S.Struct({}),
        handler: E.fn(function* (args) {
          expectTypeOf(args).toEqualTypeOf<{}>()
          return 1
        }),
      })

      expectTypeOfRegisteredMutationArgs(internalMutationWithNoArgs).toEqualTypeOf<{
        sessionId?: string | undefined
        date: string
      }>()
      expectTypeOfRegisteredMutationReturns(internalMutationWithNoArgs).toEqualTypeOf<
        Promise<number>
      >()

      const internalMutationWithArgs = internalMutation({
        args: S.Struct({message: S.String}),
        handler: E.fn(function* (args) {
          expectTypeOf(args).toEqualTypeOf<{readonly message: string}>()
          return "a value"
        }),
      })

      expectTypeOfRegisteredMutationArgs(internalMutationWithArgs).toEqualTypeOf<{
        sessionId?: string | undefined
        date: string
        message: string
      }>()
      expectTypeOfRegisteredMutationReturns(internalMutationWithArgs).toEqualTypeOf<
        Promise<string>
      >()

      const internalMutationWithReturns = internalMutation({
        args: S.Struct({}),
        returns: S.NumberFromString,
        handler: E.fn(function* (args) {
          expectTypeOf(args).toEqualTypeOf<{}>()
          return "a value"
        }),
      })

      expectTypeOfRegisteredMutationArgs(internalMutationWithReturns).toEqualTypeOf<{
        sessionId?: string | undefined
        date: string
      }>()
      expectTypeOfRegisteredMutationReturns(internalMutationWithReturns).toEqualTypeOf<
        Promise<number>
      >()
    })

    test("should add args", () => {
      const internalMutation = customMutation(internalMutationBuilder, {
        QueryCtx,
        MutationCtx,
        args: S.Struct({}),
        input: E.fn(function* (args) {
          expectTypeOf(args).toEqualTypeOf<{}>()
          return {args: {timestamp: Date.now()} as const}
        }),
      })

      const internalMutationWithNoArgs = internalMutation({
        args: S.Struct({}),
        handler: E.fn(function* (args) {
          expectTypeOf(args).toEqualTypeOf<{readonly timestamp: number}>()
          return 1
        }),
      })

      expectTypeOfRegisteredMutationArgs(internalMutationWithNoArgs).toEqualTypeOf<{}>()
      expectTypeOfRegisteredMutationReturns(internalMutationWithNoArgs).toEqualTypeOf<
        Promise<number>
      >()

      const internalMutationWithArgs = internalMutation({
        args: S.Struct({message: S.String}),
        handler: E.fn(function* (args) {
          expectTypeOf(args).toEqualTypeOf<{
            readonly timestamp: number
            readonly message: string
          }>()
          return "a value"
        }),
      })

      expectTypeOfRegisteredMutationArgs(internalMutationWithArgs).toEqualTypeOf<{
        message: string
      }>()
      expectTypeOfRegisteredMutationReturns(internalMutationWithArgs).toEqualTypeOf<
        Promise<string>
      >()

      const internalMutationWithRedeclaredArgs = internalMutation({
        args: S.Struct({timestamp: S.Number}),
        handler: E.fn(function* (args) {
          expectTypeOf(args).toEqualTypeOf<{readonly timestamp: number}>()
          return "a value"
        }),
      })

      expectTypeOfRegisteredMutationArgs(internalMutationWithRedeclaredArgs).toEqualTypeOf<{
        timestamp: number
      }>()
      expectTypeOfRegisteredMutationReturns(internalMutationWithRedeclaredArgs).toEqualTypeOf<
        Promise<string>
      >()

      const internalMutationWithReturns = internalMutation({
        args: S.Struct({}),
        returns: S.NumberFromString,
        handler: E.fn(function* (args) {
          expectTypeOf(args).toEqualTypeOf<{readonly timestamp: number}>()
          return "a value"
        }),
      })

      expectTypeOfRegisteredMutationArgs(internalMutationWithReturns).toEqualTypeOf<{}>()
      expectTypeOfRegisteredMutationReturns(internalMutationWithReturns).toEqualTypeOf<
        Promise<number>
      >()
    })

    test("should provide additional layers", () => {
      const internalMutation = customMutation(internalMutationBuilder, {
        QueryCtx,
        MutationCtx,
        args: S.Struct({}),
        input: E.fn(function* (args) {
          expectTypeOf(args).toEqualTypeOf<{}>()
          const ctx = yield* MutationCtx
          const id = yield* ctx.auth.getUserIdentity()
          const session = yield* ctx.db
            .query("sessions")
            .withIndex("by_token", (q) => q.eq("token", id?.subject ?? ""))
            .unique()
          const SessionLive = Layer.succeed(SessionContext, {sessionId: session?._id})
          return {layers: [SessionLive]}
        }),
      })

      const internalMutationWithNoArgs = internalMutation({
        args: S.Struct({}),
        handler: E.fn(function* (args) {
          expectTypeOf(args).toEqualTypeOf<{}>()
          const {db} = yield* MutationCtx
          const {sessionId} = yield* SessionContext
          if (sessionId) {
            return yield* db.get(sessionId).pipe(E.map((session) => session?.userId ?? null))
          }
          return null
        }),
      })

      expectTypeOfRegisteredMutationArgs(internalMutationWithNoArgs).toEqualTypeOf<{}>()
      expectTypeOfRegisteredMutationReturns(internalMutationWithNoArgs).toEqualTypeOf<
        Promise<GenericId<"users"> | null>
      >()

      const internalMutationWithArgs = internalMutation({
        args: S.Struct({message: S.String}),
        handler: E.fn(function* (args) {
          expectTypeOf(args).toEqualTypeOf<{readonly message: string}>()
          const {db} = yield* MutationCtx
          const {sessionId} = yield* SessionContext
          if (sessionId) {
            return yield* db.get(sessionId).pipe(E.map((session) => session?.userId ?? null))
          }
          return null
        }),
      })

      expectTypeOfRegisteredMutationArgs(internalMutationWithArgs).toEqualTypeOf<{
        message: string
      }>()
      expectTypeOfRegisteredMutationReturns(internalMutationWithArgs).toEqualTypeOf<
        Promise<GenericId<"users"> | null>
      >()

      const internalMutationWithReturns = internalMutation({
        args: S.Struct({}),
        returns: S.NullOr(SDocId("users")),
        handler: E.fn(function* (args) {
          expectTypeOf(args).toEqualTypeOf<{}>()
          const {db} = yield* MutationCtx
          const {sessionId} = yield* SessionContext
          if (sessionId) {
            return yield* db.get(sessionId).pipe(E.map((session) => session?.userId ?? null))
          }
          return null
        }),
      })

      expectTypeOfRegisteredMutationArgs(internalMutationWithReturns).toEqualTypeOf<{}>()
      expectTypeOfRegisteredMutationReturns(internalMutationWithReturns).toEqualTypeOf<
        Promise<GenericId<"users"> | null>
      >()
    })
  })

  describe("complex cases", () => {
    test("provide everything", () => {
      const mutation = customMutation(mutationBuilder, {
        QueryCtx,
        MutationCtx,
        args: S.Struct({sessionId: S.optional(SDocId("sessions"))}),
        input: E.fn(function* (args) {
          expectTypeOf(args).toEqualTypeOf<{readonly sessionId?: GenericId<"sessions">}>()

          const ctx = yield* MutationCtx
          const SessionLive = Layer.succeed(SessionContext, {sessionId: args.sessionId})
          const AuthenticatedUserIdLive = Layer.effect(
            AuthenticatedUserContext,
            E.gen(function* () {
              const {sessionId} = yield* SessionContext
              const session = yield* ctx.db
                .query("sessions")
                .withIndex("by_id", (q) => q.eq("_id", sessionId!))
                .unique()

              if (!session) {
                return yield* new DocNotFoundError({
                  tableName: "sessions",
                  metadata: {sessionId: args.sessionId},
                })
              }

              return {userId: session.userId}
            }),
          ).pipe(Layer.provide(SessionLive))

          return {
            args: {
              timestamp: Date.now(),
            } as const,
            layers: [SessionLive, AuthenticatedUserIdLive],
          }
        }),
      })

      const mutationWithNoArgs = mutation({
        args: S.Struct({}),
        handler: E.fn(function* (args) {
          expectTypeOf(args).toEqualTypeOf<{readonly timestamp: number}>()
          const {db} = yield* MutationCtx
          const {sessionId} = yield* SessionContext
          const {userId} = yield* AuthenticatedUserContext
          const user = yield* db
            .get(userId)
            .pipe(
              E.andThen(
                fromNullableOrFail(
                  () => new DocNotFoundError({tableName: "users", metadata: {userId}}),
                ),
              ),
            )

          const session = yield* db
            .query("sessions")
            .withIndex("by_user_id", (q) => q.eq("userId", user._id))
            .unique()
            .pipe(
              E.andThen(
                fromNullableOrFail(
                  () => new DocNotFoundError({tableName: "sessions", metadata: {userId: user._id}}),
                ),
              ),
            )

          if (session?._id != sessionId) {
            return null
          }

          return session.token
        }),
      })

      expectTypeOfRegisteredMutationArgs(mutationWithNoArgs).toEqualTypeOf<{
        sessionId?: GenericId<"sessions">
      }>()
      expectTypeOfRegisteredMutationReturns(mutationWithNoArgs).toEqualTypeOf<
        Promise<string | null>
      >()

      const mutationWithArgs = mutation({
        args: S.Struct({message: S.String}),
        handler: E.fn(function* (args) {
          expectTypeOf(args).toEqualTypeOf<{readonly timestamp: number; readonly message: string}>()
          const {db} = yield* MutationCtx
          const {sessionId} = yield* SessionContext
          const {userId} = yield* AuthenticatedUserContext
          const user = yield* db
            .get(userId)
            .pipe(
              E.andThen(
                fromNullableOrFail(
                  () => new DocNotFoundError({tableName: "users", metadata: {userId}}),
                ),
              ),
            )

          const session = yield* db
            .query("sessions")
            .withIndex("by_user_id", (q) => q.eq("userId", user._id))
            .unique()
            .pipe(
              E.andThen(
                fromNullableOrFail(
                  () => new DocNotFoundError({tableName: "sessions", metadata: {userId: user._id}}),
                ),
              ),
            )

          if (session?._id != sessionId) {
            return null
          }

          return session.token
        }),
      })

      expectTypeOfRegisteredMutationArgs(mutationWithArgs).toEqualTypeOf<{
        sessionId?: GenericId<"sessions">
        message: string
      }>()
      expectTypeOfRegisteredMutationReturns(mutationWithArgs).toEqualTypeOf<
        Promise<string | null>
      >()

      const mutationWithReturns = mutation({
        args: S.Struct({}),
        returns: S.NullOr(S.String),
        handler: E.fn(function* (args) {
          expectTypeOf(args).toEqualTypeOf<{readonly timestamp: number}>()
          const {db} = yield* MutationCtx
          const {sessionId} = yield* SessionContext
          const {userId} = yield* AuthenticatedUserContext
          const user = yield* db
            .get(userId)
            .pipe(
              E.andThen(
                fromNullableOrFail(
                  () => new DocNotFoundError({tableName: "users", metadata: {userId}}),
                ),
              ),
            )

          const session = yield* db
            .query("sessions")
            .withIndex("by_user_id", (q) => q.eq("userId", user._id))
            .unique()
            .pipe(
              E.andThen(
                fromNullableOrFail(
                  () => new DocNotFoundError({tableName: "sessions", metadata: {userId: user._id}}),
                ),
              ),
            )

          if (session?._id != sessionId) {
            return null
          }

          return session.token
        }),
      })

      expectTypeOfRegisteredMutationArgs(mutationWithReturns).toEqualTypeOf<{
        sessionId?: GenericId<"sessions">
      }>()
      expectTypeOfRegisteredMutationReturns(mutationWithReturns).toEqualTypeOf<
        Promise<string | null>
      >()
    })
  })
})
