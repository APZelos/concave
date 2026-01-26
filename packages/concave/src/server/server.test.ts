/* eslint-disable @typescript-eslint/no-empty-object-type */
import type {EmptyObject} from "@apzelos/concave-internal/type"
import type {
  DataModelFromSchemaDefinition,
  PublicHttpAction,
  RegisteredAction,
  RegisteredMutation,
  RegisteredQuery,
} from "convex/server"
import type {ActionBuilder, MutationBuilder, QueryBuilder} from "./server"

import {
  expectTypeOfRegisteredActionArgs,
  expectTypeOfRegisteredActionReturns,
  expectTypeOfRegisteredMutationArgs,
  expectTypeOfRegisteredMutationReturns,
  expectTypeOfRegisteredQueryArgs,
  expectTypeOfRegisteredQueryReturns,
} from "@apzelos/concave-internal/assert"
import {describe, expectTypeOf, test} from "@effect/vitest"
import {defineSchema, defineTable} from "convex/server"
import {v} from "convex/values"
import {Effect as E, Schema as S} from "effect"

import {createActionCtx, createMutationCtx, createQueryCtx, HttpActionCtx} from "./context"
import {createServerFunctions} from "./server"

const _schema = defineSchema({
  user: defineTable({name: v.string()}),
})

type DataModel = DataModelFromSchemaDefinition<typeof _schema>

const QueryCtx = createQueryCtx<DataModel>()
const MutationCtx = createMutationCtx<DataModel>()
const ActionCtx = createActionCtx<DataModel>()
const {query, internalQuery, mutation, internalMutation, action, internalAction, httpAction} =
  createServerFunctions({
    QueryCtx,
    MutationCtx,
    ActionCtx,
  })

describe("createServerFunctions", () => {
  test("should return object with all builder functions", () => {
    const {query, internalQuery, mutation, internalMutation, action, internalAction} =
      createServerFunctions({QueryCtx, MutationCtx, ActionCtx})

    expectTypeOf(query).toEqualTypeOf<QueryBuilder<"public", DataModel>>()
    expectTypeOf(internalQuery).toEqualTypeOf<QueryBuilder<"internal", DataModel>>()
    expectTypeOf(mutation).toEqualTypeOf<MutationBuilder<"public", DataModel>>()
    expectTypeOf(internalMutation).toEqualTypeOf<MutationBuilder<"internal", DataModel>>()
    expectTypeOf(action).toEqualTypeOf<ActionBuilder<"public", DataModel>>()
    expectTypeOf(internalAction).toEqualTypeOf<ActionBuilder<"internal", DataModel>>()
  })
})

describe("query", () => {
  test("should return a RegisteredQuery with public visibility", () => {
    const result = query({
      args: S.Struct({}),
      handler: E.fn(function* () {
        return null
      }),
    })

    expectTypeOf(result).toEqualTypeOf<RegisteredQuery<"public", EmptyObject, any>>()
  })

  test("should properly type Args and Returns", () => {
    const result = query({
      args: S.Struct({name: S.String}),
      handler: E.fn(function* () {
        return "greeting"
      }),
    })

    expectTypeOfRegisteredQueryArgs(result).toEqualTypeOf<{name: string}>()
    expectTypeOfRegisteredQueryReturns(result).toEqualTypeOf<Promise<string>>()
  })

  test("should properly type Returns with schema transformation", () => {
    const result = query({
      args: S.Struct({}),
      returns: S.NumberFromString,
      handler: E.fn(function* () {
        return "42"
      }),
    })

    expectTypeOfRegisteredQueryArgs(result).toEqualTypeOf<{}>()
    expectTypeOfRegisteredQueryReturns(result).toEqualTypeOf<Promise<number>>()
  })
})

describe("internalQuery", () => {
  test("should have internal visibility type", () => {
    const result = internalQuery({
      args: S.Struct({}),
      handler: E.fn(function* () {
        return null
      }),
    })

    expectTypeOf(result).toEqualTypeOf<RegisteredQuery<"internal", EmptyObject, any>>()
  })

  test("should properly type Args and Returns", () => {
    const result = internalQuery({
      args: S.Struct({userId: S.String, limit: S.Number}),
      handler: E.fn(function* () {
        return [{id: "1", name: "User"}]
      }),
    })

    expectTypeOfRegisteredQueryArgs(result).toEqualTypeOf<{userId: string; limit: number}>()
    expectTypeOfRegisteredQueryReturns(result).toEqualTypeOf<
      Promise<{id: string; name: string}[]>
    >()
  })
})

describe("mutation", () => {
  test("should return a RegisteredMutation with public visibility", () => {
    const result = mutation({
      args: S.Struct({}),
      handler: E.fn(function* () {
        return null
      }),
    })

    expectTypeOf(result).toEqualTypeOf<RegisteredMutation<"public", EmptyObject, any>>()
  })

  test("should properly type Args and Returns", () => {
    const result = mutation({
      args: S.Struct({name: S.String, email: S.String}),
      handler: E.fn(function* () {
        return "user-id-123"
      }),
    })

    expectTypeOfRegisteredMutationArgs(result).toEqualTypeOf<{name: string; email: string}>()
    expectTypeOfRegisteredMutationReturns(result).toEqualTypeOf<Promise<string>>()
  })

  test("should properly type Returns with schema transformation", () => {
    const result = mutation({
      args: S.Struct({value: S.String}),
      returns: S.NumberFromString,
      handler: E.fn(function* () {
        return "100"
      }),
    })

    expectTypeOfRegisteredMutationArgs(result).toEqualTypeOf<{value: string}>()
    expectTypeOfRegisteredMutationReturns(result).toEqualTypeOf<Promise<number>>()
  })
})

describe("internalMutation", () => {
  test("should have internal visibility type", () => {
    const result = internalMutation({
      args: S.Struct({}),
      handler: E.fn(function* () {
        return null
      }),
    })

    expectTypeOf(result).toEqualTypeOf<RegisteredMutation<"internal", EmptyObject, any>>()
  })

  test("should properly type Args and Returns", () => {
    const result = internalMutation({
      args: S.Struct({documentId: S.String, updates: S.Struct({title: S.String})}),
      handler: E.fn(function* () {
        return true
      }),
    })

    expectTypeOfRegisteredMutationArgs(result).toEqualTypeOf<{
      documentId: string
      updates: {title: string}
    }>()
    expectTypeOfRegisteredMutationReturns(result).toEqualTypeOf<Promise<boolean>>()
  })
})

describe("action", () => {
  test("should return a RegisteredAction with public visibility", () => {
    const result = action({
      args: S.Struct({}),
      handler: E.fn(function* () {
        return null
      }),
    })

    expectTypeOf(result).toEqualTypeOf<RegisteredAction<"public", EmptyObject, any>>()
  })

  test("should properly type Args and Returns", () => {
    const result = action({
      args: S.Struct({url: S.String, method: S.String}),
      handler: E.fn(function* () {
        return {status: 200, body: "OK"}
      }),
    })

    expectTypeOfRegisteredActionArgs(result).toEqualTypeOf<{url: string; method: string}>()
    expectTypeOfRegisteredActionReturns(result).toEqualTypeOf<
      Promise<{status: number; body: string}>
    >()
  })

  test("should properly type Returns with schema transformation", () => {
    const result = action({
      args: S.Struct({input: S.String}),
      returns: S.NumberFromString,
      handler: E.fn(function* () {
        return "42"
      }),
    })

    expectTypeOfRegisteredActionArgs(result).toEqualTypeOf<{input: string}>()
    expectTypeOfRegisteredActionReturns(result).toEqualTypeOf<Promise<number>>()
  })
})

describe("internalAction", () => {
  test("should have internal visibility type", () => {
    const result = internalAction({
      args: S.Struct({}),
      handler: E.fn(function* () {
        return null
      }),
    })

    expectTypeOf(result).toEqualTypeOf<RegisteredAction<"internal", EmptyObject, any>>()
  })

  test("should properly type Args and Returns", () => {
    const result = internalAction({
      args: S.Struct({jobId: S.String, payload: S.Unknown}),
      handler: E.fn(function* () {
        return {success: true, processedAt: Date.now()}
      }),
    })

    expectTypeOfRegisteredActionArgs(result).toEqualTypeOf<{jobId: string; payload: unknown}>()
    expectTypeOfRegisteredActionReturns(result).toEqualTypeOf<
      Promise<{success: boolean; processedAt: number}>
    >()
  })
})

describe("httpAction", () => {
  test("should return PublicHttpAction type", () => {
    const result = httpAction(() => E.succeed(new Response("OK")))

    expectTypeOf(result).toEqualTypeOf<PublicHttpAction>()
  })

  test("should accept handler with HttpActionCtx dependency", () => {
    const result = httpAction(
      E.fn(function* (_request: Request) {
        yield* HttpActionCtx
        return new Response("OK")
      }),
    )

    expectTypeOf(result).toEqualTypeOf<PublicHttpAction>()
  })
})
