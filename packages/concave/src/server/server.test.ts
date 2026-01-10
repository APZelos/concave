/**
 * Type Testing Limitations for RegisteredQuery/RegisteredMutation
 *
 * Convex's RegisteredQuery and RegisteredMutation types are defined as:
 *
 *   type RegisteredQuery<Visibility, Args, Returns> = {
 *     isConvexFunction: true;
 *     isQuery: true;
 *   } & VisibilityProperties<Visibility>;
 *
 * The Args and Returns type parameters are declared but NEVER USED in the type
 * structure. This makes them "phantom types" - they exist only for documentation
 * but have no structural impact.
 *
 * This means:
 *   RegisteredQuery<"public", {id: string}, Promise<User>>
 *   RegisteredQuery<"public", {foo: number}, boolean>
 *
 * Are structurally IDENTICAL to TypeScript. Only Visibility affects the type.
 *
 * Implications for testing:
 * - We CAN test Visibility ("public" vs "internal")
 * - We CANNOT test Args or Returns - any assertion will pass regardless of the types
 *
 * For Args/Returns type verification, use the integration tests in src/test/
 * which use FunctionReference - that type DOES properly encode all parameters.
 */
import type {EmptyObject} from "convex-helpers"
import type {
  DataModelFromSchemaDefinition,
  PublicHttpAction,
  RegisteredMutation,
  RegisteredQuery,
} from "convex/server"
import type {GenericId} from "convex/values"
import type {Brand} from "effect"
import type {DeepMutable} from "./server"

import {describe, expect, expectTypeOf, test} from "@effect/vitest"
import {defineSchema, defineTable} from "convex/server"
import {v} from "convex/values"
import {Effect as E} from "effect"

import {createMutationCtx, createQueryCtx, HttpActionCtx} from "./context"
import {createServerFunctions} from "./server"

const _schema = defineSchema({
  user: defineTable({name: v.string()}),
})

type DataModel = DataModelFromSchemaDefinition<typeof _schema>

const QueryCtx = createQueryCtx<DataModel>()
const MutationCtx = createMutationCtx<DataModel>()
const {query, internalQuery, mutation, internalMutation, httpAction} = createServerFunctions({
  QueryCtx,
  MutationCtx,
})

describe("createServerFunctions", () => {
  test("should return object with all builder functions", () => {
    const result = createServerFunctions({QueryCtx, MutationCtx})

    expect(result).toHaveProperty("query")
    expect(result).toHaveProperty("internalQuery")
    expect(result).toHaveProperty("mutation")
    expect(result).toHaveProperty("internalMutation")
    expect(result).toHaveProperty("httpAction")
    expect(typeof result.query).toBe("function")
    expect(typeof result.internalQuery).toBe("function")
    expect(typeof result.mutation).toBe("function")
    expect(typeof result.internalMutation).toBe("function")
    expect(typeof result.httpAction).toBe("function")
  })
})

describe("query", () => {
  test("should return a RegisteredQuery with public visibility", () => {
    const result = query(
      E.fn(function* () {
        return null
      }),
    )

    // Note: We can only verify Visibility, not Args or Returns (see file header comment)
    expectTypeOf(result).toEqualTypeOf<RegisteredQuery<"public", EmptyObject, any>>()
  })
})

describe("internalQuery", () => {
  test("should have internal visibility type", () => {
    const result = internalQuery(
      E.fn(function* () {
        return null
      }),
    )

    // Note: We can only verify Visibility, not Args or Returns (see file header comment)
    expectTypeOf(result).toEqualTypeOf<RegisteredQuery<"internal", EmptyObject, any>>()
  })
})

describe("mutation", () => {
  test("should return a RegisteredMutation with public visibility", () => {
    const result = mutation(
      E.fn(function* () {
        return null
      }),
    )

    // Note: We can only verify Visibility, not Args or Returns (see file header comment)
    expectTypeOf(result).toEqualTypeOf<RegisteredMutation<"public", EmptyObject, any>>()
  })
})

describe("internalMutation", () => {
  test("should have internal visibility type", () => {
    const result = internalMutation(
      E.fn(function* () {
        return null
      }),
    )

    // Note: We can only verify Visibility, not Args or Returns (see file header comment)
    expectTypeOf(result).toEqualTypeOf<RegisteredMutation<"internal", EmptyObject, any>>()
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

describe("DeepMutable", () => {
  test("should preserve Brand types", () => {
    type Branded = string & Brand.Brand<"MyBrand">
    type Result = DeepMutable<Branded>

    expectTypeOf<Result>().toEqualTypeOf<Branded>()
  })

  test("should preserve GenericId types", () => {
    type Result = DeepMutable<GenericId<"user">>

    expectTypeOf<Result>().toEqualTypeOf<GenericId<"user">>()
  })

  test("should make readonly properties mutable", () => {
    type Input = {readonly name: string; readonly age: number}
    type Result = DeepMutable<Input>

    expectTypeOf<Result>().toEqualTypeOf<{name: string; age: number}>()
  })

  test("should recursively make nested properties mutable", () => {
    type Input = {readonly user: {readonly name: string}}
    type Result = DeepMutable<Input>

    expectTypeOf<Result>().toEqualTypeOf<{user: {name: string}}>()
  })

  test("should handle arrays", () => {
    type Input = readonly string[]
    type Result = DeepMutable<Input>

    expectTypeOf<Result>().toEqualTypeOf<string[]>()
  })
})
