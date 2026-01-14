import type {SchemaToValidator} from "./values"

import {describe, expect, expectTypeOf, test} from "@effect/vitest"
import {v} from "convex/values"
import {Option, ParseResult, Schema as S, SchemaAST} from "effect"

import {ConvexTableName, mapAstToValidator, SDocId, SPaginationResult} from "./values"

describe("mapAstToValidator", () => {
  describe("decode", () => {
    test("Schema.Any", () => {
      const schema = S.Any
      const schemaValidator = mapAstToValidator(schema.ast, "decode")
      type SchemaValidator = SchemaToValidator<S.Schema.Type<typeof schema>>
      const expected = v.any()

      expectTypeOf<SchemaValidator>().toEqualTypeOf(expected)
      expect(schemaValidator).toStrictEqual(expected)
    })

    test("SDocId", () => {
      const schema = SDocId("user")
      const schemaValidator = mapAstToValidator(schema.ast, "decode")
      type SchemaValidator = SchemaToValidator<S.Schema.Type<typeof schema>>
      const validator = v.id("user")

      expectTypeOf<SchemaValidator>().toEqualTypeOf(validator)
      expect(schemaValidator).toStrictEqual(validator)
    })

    test("Schema.Literal", () => {
      const schema = S.Literal(1)
      const schemaValidator = mapAstToValidator(schema.ast, "decode")
      type SchemaValidator = SchemaToValidator<S.Schema.Type<typeof schema>>
      const expected = v.literal(1)

      expectTypeOf<SchemaValidator>().toEqualTypeOf(expected)
      expect(schemaValidator).toStrictEqual(expected)
    })

    test("Schema.Number", () => {
      const schema = S.Number
      const schemaValidator = mapAstToValidator(schema.ast, "decode")
      type SchemaValidator = SchemaToValidator<S.Schema.Type<typeof schema>>
      const expected = v.number()

      expectTypeOf<SchemaValidator>().toEqualTypeOf(expected)
      expect(schemaValidator).toStrictEqual(expected)
    })

    test("Schema.BigIntFromSelf", () => {
      const schema = S.BigIntFromSelf
      const schemaValidator = mapAstToValidator(schema.ast, "decode")
      type SchemaValidator = SchemaToValidator<S.Schema.Type<typeof schema>>
      const expected = v.int64()

      expectTypeOf<SchemaValidator>().toEqualTypeOf(expected)
      expect(schemaValidator).toStrictEqual(expected)
    })

    test("Schema.Boolean", () => {
      const schema = S.Boolean
      const schemaValidator = mapAstToValidator(schema.ast, "decode")
      type SchemaValidator = SchemaToValidator<S.Schema.Type<typeof schema>>
      const expected = v.boolean()

      expectTypeOf<SchemaValidator>().toEqualTypeOf(expected)
      expect(schemaValidator).toStrictEqual(expected)
    })

    test("Schema.String", () => {
      const schema = S.String
      const schemaValidator = mapAstToValidator(schema.ast, "decode")
      type SchemaValidator = SchemaToValidator<S.Schema.Type<typeof schema>>
      const expected = v.string()

      expectTypeOf<SchemaValidator>().toEqualTypeOf(expected)
      expect(schemaValidator).toStrictEqual(expected)
    })

    test("Schema.NumberFromString", () => {
      const schema = S.NumberFromString
      const schemaValidator = mapAstToValidator(schema.ast, "decode")
      type SchemaValidator = SchemaToValidator<S.Schema.Type<typeof schema>>
      const expected = v.number()

      expectTypeOf<SchemaValidator>().toEqualTypeOf(expected)
      expect(schemaValidator).toStrictEqual(expected)
    })

    test("Schema.NonEmptyString", () => {
      const schema = S.NonEmptyString
      const schemaValidator = mapAstToValidator(schema.ast, "decode")
      type SchemaValidator = SchemaToValidator<S.Schema.Type<typeof schema>>
      const expected = v.string()

      expectTypeOf<SchemaValidator>().toEqualTypeOf(expected)
      expect(schemaValidator).toStrictEqual(expected)
    })

    test("Schema.BooleanFromString", () => {
      const schema = S.BooleanFromString
      const schemaValidator = mapAstToValidator(schema.ast, "decode")
      type SchemaValidator = SchemaToValidator<S.Schema.Type<typeof schema>>
      const expected = v.boolean()

      expectTypeOf<SchemaValidator>().toEqualTypeOf(expected)
      expect(schemaValidator).toStrictEqual(expected)
    })

    test("Schema.Null", () => {
      const schema = S.Null
      const schemaValidator = mapAstToValidator(schema.ast, "decode")
      type SchemaValidator = SchemaToValidator<S.Schema.Type<typeof schema>>
      const expected = v.null()

      expectTypeOf<SchemaValidator>().toEqualTypeOf(expected)
      expect(schemaValidator).toStrictEqual(expected)
    })

    test("Schema.Union", () => {
      const schema = S.Union(S.String, S.Number)
      const schemaValidator = mapAstToValidator(schema.ast, "decode")
      type SchemaValidator = SchemaToValidator<S.Schema.Type<typeof schema>>
      const expected = v.union(v.string(), v.number())

      expectTypeOf<SchemaValidator>().toEqualTypeOf(expected)
      expect(schemaValidator).toStrictEqual(expected)
    })

    test("should flatten nested unions", () => {
      const schema = S.NullOr(S.Literal("a", "b"))
      const schemaValidator = mapAstToValidator(schema.ast, "decode")
      const expected = v.union(v.literal("a"), v.literal("b"), v.null())

      // See mapAstToValidator JSDoc for union ordering limitation
      expect(schemaValidator).toStrictEqual(expected)
    })

    test("Schema.Array", () => {
      const schema = S.Array(S.String)
      const schemaValidator = mapAstToValidator(schema.ast, "decode")
      type SchemaValidator = SchemaToValidator<S.Schema.Type<typeof schema>>
      const expected = v.array(v.string())

      expectTypeOf<SchemaValidator>().toEqualTypeOf(expected)
      expect(schemaValidator).toStrictEqual(expected)
    })

    test("Schema.Tuple", () => {
      const schema = S.Tuple(S.String, S.Number)
      const schemaValidator = mapAstToValidator(schema.ast, "decode")
      type SchemaValidator = SchemaToValidator<S.Schema.Type<typeof schema>>
      const expected = v.array(v.union(v.string(), v.number()))

      expectTypeOf<SchemaValidator>().toEqualTypeOf(expected)
      expect(schemaValidator).toStrictEqual(expected)
    })

    test("Schema.Record", () => {
      const schema = S.Record({
        key: S.String,
        value: S.Number,
      })
      const schemaValidator = mapAstToValidator(schema.ast, "decode")
      type SchemaValidator = SchemaToValidator<S.Schema.Type<typeof schema>>
      const expected = v.record(v.string(), v.number())

      expectTypeOf<SchemaValidator>().toEqualTypeOf(expected)
      expect(schemaValidator).toStrictEqual(expected)
    })

    test("Schema.Struct", () => {
      const schema = S.Struct({
        id: S.optional(S.Number),
        name: S.NonEmptyString,
        kind: S.optional(S.Literal("guest", "customer")),
      })
      const schemaValidator = mapAstToValidator(schema.ast, "decode")
      type SchemaValidator = SchemaToValidator<S.Schema.Type<typeof schema>>
      const expected = v.object({
        id: v.optional(v.number()),
        name: v.string(),
        kind: v.optional(v.union(v.literal("guest"), v.literal("customer"))),
      })

      expectTypeOf<SchemaValidator>().toEqualTypeOf(expected)
      expect(schemaValidator).toStrictEqual(expected)
    })

    test.skip("Schema.Class", () => {
      class User extends S.Class<User>("User")({
        id: S.optional(SDocId("user")),
        name: S.NonEmptyString,
        kind: S.optional(S.Literal("guest", "customer")),
      }) {}

      const schemaValidator = mapAstToValidator(User.ast, "decode")

      const expected = v.object({
        id: v.optional(v.id("user")),
        name: v.string(),
        kind: v.optional(v.union(v.literal("guest"), v.literal("customer"))),
      })

      // TODO: find a way to correctly infer the validator type
      // expectTypeOf<SchemaValidator>().toEqualTypeOf(expected)
      expect(schemaValidator).toStrictEqual(expected)
    })

    test("Schema.transform", () => {
      const schema = S.transform(S.Number, S.String, {
        strict: true,
        decode: (value) => `${value}`,
        encode: () => 1,
      })
      const schemaValidator = mapAstToValidator(schema.ast, "decode")
      type SchemaValidator = SchemaToValidator<S.Schema.Type<typeof schema>>
      const expected = v.string()

      expectTypeOf<SchemaValidator>().toEqualTypeOf(expected)
      expect(schemaValidator).toStrictEqual(expected)
    })

    test("Schema.transformOrFail", () => {
      const schema = S.transformOrFail(S.Number, S.String, {
        strict: true,
        decode: (value) => ParseResult.succeed(`${value}`),
        encode: () => ParseResult.succeed(1),
      })
      const schemaValidator = mapAstToValidator(schema.ast, "decode")
      type SchemaValidator = SchemaToValidator<S.Schema.Type<typeof schema>>
      const expected = v.string()

      expectTypeOf<SchemaValidator>().toEqualTypeOf(expected)
      expect(schemaValidator).toStrictEqual(expected)
    })
  })

  describe("encode", () => {
    test("Schema.Any", () => {
      const schema = S.Any
      const schemaValidator = mapAstToValidator(schema.ast, "encode")
      type SchemaValidator = SchemaToValidator<S.Schema.Type<typeof schema>>
      const expected = v.any()

      expectTypeOf<SchemaValidator>().toEqualTypeOf(expected)
      expect(schemaValidator).toStrictEqual(expected)
    })

    test("SDocId", () => {
      const schema = SDocId("user")
      const schemaValidator = mapAstToValidator(schema.ast, "decode")
      type SchemaValidator = SchemaToValidator<S.Schema.Type<typeof schema>>
      const validator = v.id("user")

      expectTypeOf<SchemaValidator>().toEqualTypeOf(validator)
      expect(schemaValidator).toStrictEqual(validator)
    })

    test("Schema.Literal", () => {
      const schema = S.Literal(1)
      const schemaValidator = mapAstToValidator(schema.ast, "encode")
      type SchemaValidator = SchemaToValidator<S.Schema.Encoded<typeof schema>>
      const expected = v.literal(1)

      expectTypeOf<SchemaValidator>().toEqualTypeOf(expected)
      expect(schemaValidator).toStrictEqual(expected)
    })

    test("Schema.Number", () => {
      const schema = S.Number
      const schemaValidator = mapAstToValidator(schema.ast, "encode")
      type SchemaValidator = SchemaToValidator<S.Schema.Encoded<typeof schema>>
      const expected = v.number()

      expectTypeOf<SchemaValidator>().toEqualTypeOf(expected)
      expect(schemaValidator).toStrictEqual(expected)
    })

    test("Schema.BigIntFromSelf", () => {
      const schema = S.BigIntFromSelf
      const schemaValidator = mapAstToValidator(schema.ast, "encode")
      type SchemaValidator = SchemaToValidator<S.Schema.Encoded<typeof schema>>
      const expected = v.int64()

      expectTypeOf<SchemaValidator>().toEqualTypeOf(expected)
      expect(schemaValidator).toStrictEqual(expected)
    })

    test("Schema.Boolean", () => {
      const schema = S.Boolean
      const schemaValidator = mapAstToValidator(schema.ast, "encode")
      type SchemaValidator = SchemaToValidator<S.Schema.Encoded<typeof schema>>
      const expected = v.boolean()

      expectTypeOf<SchemaValidator>().toEqualTypeOf(expected)
      expect(schemaValidator).toStrictEqual(expected)
    })

    test("Schema.String", () => {
      const schema = S.String
      const schemaValidator = mapAstToValidator(schema.ast, "encode")
      type SchemaValidator = SchemaToValidator<S.Schema.Encoded<typeof schema>>
      const expected = v.string()

      expectTypeOf<SchemaValidator>().toEqualTypeOf(expected)
      expect(schemaValidator).toStrictEqual(expected)
    })

    test("Schema.NumberFromString", () => {
      const schema = S.NumberFromString
      const schemaValidator = mapAstToValidator(schema.ast, "encode")
      type SchemaValidator = SchemaToValidator<S.Schema.Encoded<typeof schema>>
      const expected = v.string()

      expectTypeOf<SchemaValidator>().toEqualTypeOf(expected)
      expect(schemaValidator).toStrictEqual(expected)
    })

    test("Schema.NonEmptyString", () => {
      const schema = S.NonEmptyString
      const schemaValidator = mapAstToValidator(schema.ast, "encode")
      type SchemaValidator = SchemaToValidator<S.Schema.Encoded<typeof schema>>
      const expected = v.string()

      expectTypeOf<SchemaValidator>().toEqualTypeOf(expected)
      expect(schemaValidator).toStrictEqual(expected)
    })

    test("Schema.DateFromString", () => {
      const schema = S.DateFromString
      const schemaValidator = mapAstToValidator(schema.ast, "encode")
      type SchemaValidator = SchemaToValidator<S.Schema.Encoded<typeof schema>>
      const expected = v.string()

      expectTypeOf<SchemaValidator>().toEqualTypeOf(expected)
      expect(schemaValidator).toStrictEqual(expected)
    })

    test("Schema.BooleanFromString", () => {
      const schema = S.BooleanFromString
      const schemaValidator = mapAstToValidator(schema.ast, "encode")
      type SchemaValidator = SchemaToValidator<S.Schema.Encoded<typeof schema>>
      const expected = v.union(v.literal("true"), v.literal("false"))

      expectTypeOf<SchemaValidator>().toEqualTypeOf(expected)
      expect(schemaValidator).toStrictEqual(expected)
    })

    test("Schema.Null", () => {
      const schema = S.Null
      const schemaValidator = mapAstToValidator(schema.ast, "encode")
      type SchemaValidator = SchemaToValidator<S.Schema.Encoded<typeof schema>>
      const expected = v.null()

      expectTypeOf<SchemaValidator>().toEqualTypeOf(expected)
      expect(schemaValidator).toStrictEqual(expected)
    })

    test("Schema.Union", () => {
      const schema = S.Union(S.String, S.Number)
      const schemaValidator = mapAstToValidator(schema.ast, "encode")
      type SchemaValidator = SchemaToValidator<S.Schema.Encoded<typeof schema>>
      const expected = v.union(v.string(), v.number())

      expectTypeOf<SchemaValidator>().toEqualTypeOf(expected)
      expect(schemaValidator).toStrictEqual(expected)
    })

    test("Schema.Array", () => {
      const schema = S.Array(S.String)
      const schemaValidator = mapAstToValidator(schema.ast, "encode")
      type SchemaValidator = SchemaToValidator<S.Schema.Encoded<typeof schema>>
      const expected = v.array(v.string())

      expectTypeOf<SchemaValidator>().toEqualTypeOf(expected)
      expect(schemaValidator).toStrictEqual(expected)
    })

    test("Schema.Tuple", () => {
      const schema = S.Tuple(S.String, S.Number)
      const schemaValidator = mapAstToValidator(schema.ast, "encode")
      type SchemaValidator = SchemaToValidator<S.Schema.Encoded<typeof schema>>
      const expected = v.array(v.union(v.string(), v.number()))

      expectTypeOf<SchemaValidator>().toEqualTypeOf(expected)
      expect(schemaValidator).toStrictEqual(expected)
    })

    test("Schema.Record", () => {
      const schema = S.Record({
        key: S.String,
        value: S.Number,
      })
      const schemaValidator = mapAstToValidator(schema.ast, "encode")
      type SchemaValidator = SchemaToValidator<S.Schema.Encoded<typeof schema>>
      const expected = v.record(v.string(), v.number())

      expectTypeOf<SchemaValidator>().toEqualTypeOf(expected)
      expect(schemaValidator).toStrictEqual(expected)
    })

    test("Schema.Struct", () => {
      const schema = S.Struct({
        id: S.optional(S.Number),
        name: S.NonEmptyString,
        kind: S.optional(S.Literal("guest", "customer")),
      })
      const schemaValidator = mapAstToValidator(schema.ast, "encode")
      type SchemaValidator = SchemaToValidator<S.Schema.Encoded<typeof schema>>
      const expected = v.object({
        id: v.optional(v.number()),
        name: v.string(),
        kind: v.optional(v.union(v.literal("guest"), v.literal("customer"))),
      })

      expectTypeOf<SchemaValidator>().toEqualTypeOf(expected)
      expect(schemaValidator).toStrictEqual(expected)
    })

    test("Schema.Class", () => {
      class User extends S.Class<User>("User")({
        id: S.optional(SDocId("user")),
        name: S.NonEmptyString,
        kind: S.optional(S.Literal("guest", "customer")),
      }) {}

      const schemaValidator = mapAstToValidator(User.ast, "encode")
      type SchemaValidator = SchemaToValidator<S.Schema.Encoded<typeof User>>
      const expected = v.object({
        id: v.optional(v.id("user")),
        name: v.string(),
        kind: v.optional(v.union(v.literal("guest"), v.literal("customer"))),
      })

      expectTypeOf<SchemaValidator>().toEqualTypeOf(expected)
      expect(schemaValidator).toStrictEqual(expected)
    })

    test("Schema.transform", () => {
      const schema = S.transform(S.Number, S.String, {
        strict: true,
        decode: (value) => `${value}`,
        encode: () => 1,
      })
      const schemaValidator = mapAstToValidator(schema.ast, "encode")
      type SchemaValidator = SchemaToValidator<S.Schema.Encoded<typeof schema>>
      const expected = v.number()

      expectTypeOf<SchemaValidator>().toEqualTypeOf(expected)
      expect(schemaValidator).toStrictEqual(expected)
    })

    test("Schema.transformOrFail", () => {
      const schema = S.transformOrFail(S.Number, S.String, {
        strict: true,
        decode: (value) => ParseResult.succeed(`${value}`),
        encode: () => ParseResult.succeed(1),
      })
      const schemaValidator = mapAstToValidator(schema.ast, "encode")
      type SchemaValidator = SchemaToValidator<S.Schema.Encoded<typeof schema>>

      const expected = v.number()

      expectTypeOf<SchemaValidator>().toEqualTypeOf(expected)
      expect(schemaValidator).toStrictEqual(expected)
    })
  })

  describe("SPaginationResult", () => {
    test("should create pagination result schema with correct structure", () => {
      const schema = SPaginationResult(S.String)
      const schemaValidator = mapAstToValidator(schema.ast, "decode")
      const expected = v.object({
        page: v.array(v.string()),
        isDone: v.boolean(),
        continueCursor: v.string(),
        splitCursor: v.optional(v.union(v.string(), v.null())),
        pageStatus: v.optional(
          v.union(v.literal("SplitRecommended"), v.literal("SplitRequired"), v.null()),
        ),
      })

      // See mapAstToValidator JSDoc for union ordering limitation
      expect(schemaValidator).toStrictEqual(expected)
    })

    test("should work with complex element schemas", () => {
      const schema = SPaginationResult(S.Struct({id: S.Number, name: S.String}))
      const schemaValidator = mapAstToValidator(schema.ast, "decode")
      const expected = v.object({
        page: v.array(v.object({id: v.number(), name: v.string()})),
        isDone: v.boolean(),
        continueCursor: v.string(),
        splitCursor: v.optional(v.union(v.string(), v.null())),
        pageStatus: v.optional(
          v.union(v.literal("SplitRecommended"), v.literal("SplitRequired"), v.null()),
        ),
      })

      // See mapAstToValidator JSDoc for union ordering limitation
      expect(schemaValidator).toStrictEqual(expected)
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

      expect(() => mapAstToValidator(schema.ast, "decode")).toThrow(
        "Convex doesn't support optional elements for tuples",
      )
    })

    test("should throw for empty tuple schema", () => {
      const schema = S.Tuple()

      expect(() => mapAstToValidator(schema.ast, "decode")).toThrow(
        "Array/Tuple schemas require at least one element schema",
      )
    })

    // Note: Non-string record keys are already rejected by Effect Schema itself,
    // so we can't test that error path in mapAstToValidator

    test("should throw for unsupported schema types", () => {
      const schema = S.SymbolFromSelf

      expect(() => mapAstToValidator(schema.ast, "decode")).toThrow("Unsupported schema")
    })
  })
})
