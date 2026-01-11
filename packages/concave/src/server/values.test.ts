import {describe, expect, expectTypeOf, test} from "@effect/vitest"
import {v} from "convex/values"
import {Option, ParseResult, Schema as S, SchemaAST} from "effect"

import {
  ConvexTableName,
  mapDecodedSchemaToValidator,
  mapEncodedSchemaToValidator,
  SDocId,
  SPaginationResult,
} from "./values"

describe("mapDecodedSchemaToValidator", () => {
  test("Schema.Any", () => {
    const actual = mapDecodedSchemaToValidator(S.Any)
    const expected = v.any()

    expectTypeOf(actual).toEqualTypeOf(expected)
    expect(actual).toStrictEqual(expected)
  })

  test("SDocId", () => {
    const actual = mapDecodedSchemaToValidator(SDocId("user"))
    const expected = v.id("user")

    expectTypeOf(actual).toEqualTypeOf(expected)
    expect(actual).toStrictEqual(expected)
  })

  test("Schema.Literal", () => {
    const actual = mapDecodedSchemaToValidator(S.Literal(1))
    const expected = v.literal(1)

    expectTypeOf(actual).toEqualTypeOf(expected)
    expect(actual).toStrictEqual(expected)
  })

  test("Schema.Number", () => {
    const actual = mapDecodedSchemaToValidator(S.Number)
    const expected = v.number()

    expectTypeOf(actual).toEqualTypeOf(expected)
    expect(actual).toStrictEqual(expected)
  })

  test("Schema.BigIntFromSelf", () => {
    const actual = mapDecodedSchemaToValidator(S.BigIntFromSelf)
    const expected = v.int64()

    expectTypeOf(actual).toEqualTypeOf(expected)
    expect(actual).toStrictEqual(expected)
  })

  test("Schema.Boolean", () => {
    const actual = mapDecodedSchemaToValidator(S.Boolean)
    const expected = v.boolean()

    expectTypeOf(actual).toEqualTypeOf(expected)
    expect(actual).toStrictEqual(expected)
  })

  test("Schema.String", () => {
    const actual = mapDecodedSchemaToValidator(S.String)
    const expected = v.string()

    expectTypeOf(actual).toEqualTypeOf(expected)
    expect(actual).toStrictEqual(expected)
  })

  test("Schema.NumberFromString", () => {
    const actual = mapDecodedSchemaToValidator(S.NumberFromString)
    const expected = v.number()

    expectTypeOf(actual).toEqualTypeOf(expected)
    expect(actual).toStrictEqual(expected)
  })

  test("Schema.NonEmptyString", () => {
    const actual = mapDecodedSchemaToValidator(S.NonEmptyString)
    const expected = v.string()

    expectTypeOf(actual).toEqualTypeOf(expected)
    expect(actual).toStrictEqual(expected)
  })

  test("Schema.BooleanFromString", () => {
    const actual = mapDecodedSchemaToValidator(S.BooleanFromString)
    const expected = v.boolean()

    expectTypeOf(actual).toEqualTypeOf(expected)
    expect(actual).toStrictEqual(expected)
  })

  test("Schema.Null", () => {
    const actual = mapDecodedSchemaToValidator(S.Null)
    const expected = v.null()

    expectTypeOf(actual).toEqualTypeOf(expected)
    expect(actual).toStrictEqual(expected)
  })

  test("Schema.Union", () => {
    const actual = mapDecodedSchemaToValidator(S.Union(S.String, S.Number))
    const expected = v.union(v.string(), v.number())

    expectTypeOf(actual).toEqualTypeOf(expected)
    expect(actual).toStrictEqual(expected)
  })

  test("should flatten nested unions", () => {
    const actual = mapDecodedSchemaToValidator(S.NullOr(S.Literal("a", "b")))
    const expected = v.union(v.literal("a"), v.literal("b"), v.null())

    // See mapDecodedSchemaToValidator JSDoc for union ordering limitation
    expect(actual).toStrictEqual(expected)
  })

  test("Schema.Array", () => {
    const actual = mapDecodedSchemaToValidator(S.Array(S.String))
    const expected = v.array(v.string())

    expectTypeOf(actual).toEqualTypeOf(expected)
    expect(actual).toStrictEqual(expected)
  })

  test("Schema.Tuple", () => {
    const actual = mapDecodedSchemaToValidator(S.Tuple(S.String, S.Number))
    const expected = v.array(v.union(v.string(), v.number()))

    expectTypeOf(actual).toEqualTypeOf(expected)
    expect(actual).toStrictEqual(expected)
  })

  test("Schema.Record", () => {
    const actual = mapDecodedSchemaToValidator(
      S.Record({
        key: S.String,
        value: S.Number,
      }),
    )

    const expected = v.record(v.string(), v.number())

    expectTypeOf(actual).toEqualTypeOf(expected)
    expect(actual).toStrictEqual(expected)
  })

  test("Schema.Struct", () => {
    const actual = mapDecodedSchemaToValidator(
      S.Struct({
        id: S.optional(S.Number),
        name: S.NonEmptyString,
        kind: S.optional(S.Literal("guest", "customer")),
      }),
    )

    const expected = v.object({
      id: v.optional(v.number()),
      name: v.string(),
      kind: v.optional(v.union(v.literal("guest"), v.literal("customer"))),
    })

    expectTypeOf(actual).toEqualTypeOf(expected)
    expect(actual).toStrictEqual(expected)
  })

  test.skip("Schema.Class", () => {
    class User extends S.Class<User>("User")({
      id: S.optional(SDocId("user")),
      name: S.NonEmptyString,
      kind: S.optional(S.Literal("guest", "customer")),
    }) {}

    const actual = mapDecodedSchemaToValidator(User)

    const expected = v.object({
      id: v.optional(v.id("user")),
      name: v.string(),
      kind: v.optional(v.union(v.literal("guest"), v.literal("customer"))),
    })

    // TODO: find a way to correcty infer the validator type
    // expectTypeOf(actual).toEqualTypeOf(expected)
    expect(actual).toStrictEqual(expected)
  })

  test("Schema.transform", () => {
    const actual = mapDecodedSchemaToValidator(
      S.transform(S.Number, S.String, {
        strict: true,
        decode: (value) => `${value}`,
        encode: () => 1,
      }),
    )

    const expected = v.string()

    expectTypeOf(actual).toEqualTypeOf(expected)
    expect(actual).toStrictEqual(expected)
  })

  test("Schema.transformOrFail", () => {
    const actual = mapDecodedSchemaToValidator(
      S.transformOrFail(S.Number, S.String, {
        strict: true,
        decode: (value) => ParseResult.succeed(`${value}`),
        encode: () => ParseResult.succeed(1),
      }),
    )

    const expected = v.string()

    expectTypeOf(actual).toEqualTypeOf(expected)
    expect(actual).toStrictEqual(expected)
  })
})

describe("mapEncodedSchemaToValidator", () => {
  test("Schema.Any", () => {
    const actual = mapEncodedSchemaToValidator(S.Any)
    const expected = v.any()

    expectTypeOf(actual).toEqualTypeOf(expected)
    expect(actual).toStrictEqual(expected)
  })

  test("SDocId", () => {
    const actual = mapEncodedSchemaToValidator(SDocId("user"))
    const expected = v.id("user")

    expectTypeOf(actual).toEqualTypeOf(expected)
    expect(actual).toStrictEqual(expected)
  })

  test("Schema.Literal", () => {
    const actual = mapEncodedSchemaToValidator(S.Literal(1))
    const expected = v.literal(1)

    expectTypeOf(actual).toEqualTypeOf(expected)
    expect(actual).toStrictEqual(expected)
  })

  test("Schema.Number", () => {
    const actual = mapEncodedSchemaToValidator(S.Number)
    const expected = v.number()

    expectTypeOf(actual).toEqualTypeOf(expected)
    expect(actual).toStrictEqual(expected)
  })

  test("Schema.BigIntFromSelf", () => {
    const actual = mapEncodedSchemaToValidator(S.BigIntFromSelf)
    const expected = v.int64()

    expectTypeOf(actual).toEqualTypeOf(expected)
    expect(actual).toStrictEqual(expected)
  })

  test("Schema.Boolean", () => {
    const actual = mapEncodedSchemaToValidator(S.Boolean)
    const expected = v.boolean()

    expectTypeOf(actual).toEqualTypeOf(expected)
    expect(actual).toStrictEqual(expected)
  })

  test("Schema.String", () => {
    const actual = mapEncodedSchemaToValidator(S.String)
    const expected = v.string()

    expectTypeOf(actual).toEqualTypeOf(expected)
    expect(actual).toStrictEqual(expected)
  })

  test("Schema.NumberFromString", () => {
    const actual = mapEncodedSchemaToValidator(S.NumberFromString)
    const expected = v.string()

    expectTypeOf(actual).toEqualTypeOf(expected)
    expect(actual).toStrictEqual(expected)
  })

  test("Schema.NonEmptyString", () => {
    const actual = mapEncodedSchemaToValidator(S.NonEmptyString)
    const expected = v.string()

    expectTypeOf(actual).toEqualTypeOf(expected)
    expect(actual).toStrictEqual(expected)
  })

  test("Schema.DateFromString", () => {
    const actual = mapEncodedSchemaToValidator(S.DateFromString)
    const expected = v.string()

    expectTypeOf(actual).toEqualTypeOf(expected)
    expect(actual).toStrictEqual(expected)
  })

  test("Schema.BooleanFromString", () => {
    const actual = mapEncodedSchemaToValidator(S.BooleanFromString)
    const expected = v.union(v.literal("true"), v.literal("false"))

    expectTypeOf(actual).toEqualTypeOf(expected)
    expect(actual).toStrictEqual(expected)
  })

  test("Schema.Null", () => {
    const actual = mapEncodedSchemaToValidator(S.Null)
    const expected = v.null()

    expectTypeOf(actual).toEqualTypeOf(expected)
    expect(actual).toStrictEqual(expected)
  })

  test("Schema.Union", () => {
    const actual = mapEncodedSchemaToValidator(S.Union(S.String, S.Number))
    const expected = v.union(v.string(), v.number())

    expectTypeOf(actual).toEqualTypeOf(expected)
    expect(actual).toStrictEqual(expected)
  })

  test("Schema.Array", () => {
    const actual = mapEncodedSchemaToValidator(S.Array(S.String))
    const expected = v.array(v.string())

    expectTypeOf(actual).toEqualTypeOf(expected)
    expect(actual).toStrictEqual(expected)
  })

  test("Schema.Tuple", () => {
    const actual = mapEncodedSchemaToValidator(S.Tuple(S.String, S.Number))
    const expected = v.array(v.union(v.string(), v.number()))

    expectTypeOf(actual).toEqualTypeOf(expected)
    expect(actual).toStrictEqual(expected)
  })

  test("Schema.Record", () => {
    const actual = mapEncodedSchemaToValidator(
      S.Record({
        key: S.String,
        value: S.Number,
      }),
    )

    const expected = v.record(v.string(), v.number())

    expectTypeOf(actual).toEqualTypeOf(expected)
    expect(actual).toStrictEqual(expected)
  })

  test("Schema.Struct", () => {
    const actual = mapEncodedSchemaToValidator(
      S.Struct({
        id: S.optional(S.Number),
        name: S.NonEmptyString,
        kind: S.optional(S.Literal("guest", "customer")),
      }),
    )

    const expected = v.object({
      id: v.optional(v.number()),
      name: v.string(),
      kind: v.optional(v.union(v.literal("guest"), v.literal("customer"))),
    })

    expectTypeOf(actual).toEqualTypeOf(expected)
    expect(actual).toStrictEqual(expected)
  })

  test("Schema.Class", () => {
    class User extends S.Class<User>("User")({
      id: S.optional(SDocId("user")),
      name: S.NonEmptyString,
      kind: S.optional(S.Literal("guest", "customer")),
    }) {}

    const actual = mapEncodedSchemaToValidator(User)

    const expected = v.object({
      id: v.optional(v.id("user")),
      name: v.string(),
      kind: v.optional(v.union(v.literal("guest"), v.literal("customer"))),
    })

    expectTypeOf(actual).toEqualTypeOf(expected)
    expect(actual).toStrictEqual(expected)
  })

  test("Schema.transform", () => {
    const actual = mapEncodedSchemaToValidator(
      S.transform(S.Number, S.String, {
        strict: true,
        decode: (value) => `${value}`,
        encode: () => 1,
      }),
    )

    const expected = v.number()

    expectTypeOf(actual).toEqualTypeOf(expected)
    expect(actual).toStrictEqual(expected)
  })

  test("Schema.transformOrFail", () => {
    const actual = mapEncodedSchemaToValidator(
      S.transformOrFail(S.Number, S.String, {
        strict: true,
        decode: (value) => ParseResult.succeed(`${value}`),
        encode: () => ParseResult.succeed(1),
      }),
    )

    const expected = v.number()

    expectTypeOf(actual).toEqualTypeOf(expected)
    expect(actual).toStrictEqual(expected)
  })
})

describe("SPaginationResult", () => {
  test("should create pagination result schema with correct structure", () => {
    const actual = mapDecodedSchemaToValidator(SPaginationResult(S.String))
    const expected = v.object({
      page: v.array(v.string()),
      isDone: v.boolean(),
      continueCursor: v.string(),
      splitCursor: v.optional(v.union(v.string(), v.null())),
      pageStatus: v.optional(
        v.union(v.literal("SplitRecommended"), v.literal("SplitRequired"), v.null()),
      ),
    })

    // See mapDecodedSchemaToValidator JSDoc for union ordering limitation
    expect(actual).toStrictEqual(expected)
  })

  test("should work with complex element schemas", () => {
    const actual = mapDecodedSchemaToValidator(
      SPaginationResult(S.Struct({id: S.Number, name: S.String})),
    )
    const expected = v.object({
      page: v.array(v.object({id: v.number(), name: v.string()})),
      isDone: v.boolean(),
      continueCursor: v.string(),
      splitCursor: v.optional(v.union(v.string(), v.null())),
      pageStatus: v.optional(
        v.union(v.literal("SplitRecommended"), v.literal("SplitRequired"), v.null()),
      ),
    })

    // See mapDecodedSchemaToValidator JSDoc for union ordering limitation
    expect(actual).toStrictEqual(expected)
  })
})

describe("SDocId", () => {
  test("should attach table name annotation", () => {
    const schema = SDocId("user")
    const annotation = SchemaAST.getAnnotation<string>(ConvexTableName)(schema.ast)

    expect(Option.isSome(annotation)).toBe(true)
    expect(Option.getOrNull(annotation)).toBe("user")
  })
})

describe("error cases", () => {
  test("should throw for optional tuple elements", () => {
    const schema = S.Tuple(S.String, S.optionalElement(S.Number))

    expect(() => mapDecodedSchemaToValidator(schema)).toThrow(
      "Convex doesn't support optional elements for tuples",
    )
  })

  test("should throw for empty tuple schema", () => {
    const schema = S.Tuple()

    expect(() => mapDecodedSchemaToValidator(schema)).toThrow(
      "Array/Tuple schemas require at least one element schema",
    )
  })

  // Note: Non-string record keys are already rejected by Effect Schema itself,
  // so we can't test that error path in mapDecodedSchemaToValidator

  test("should throw for unsupported schema types", () => {
    const schema = S.SymbolFromSelf

    expect(() => mapDecodedSchemaToValidator(schema)).toThrow("Unsupported schema")
  })
})
