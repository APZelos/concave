import {createModelFunction} from "@apzelos/concave-model"
import {SDocId} from "@apzelos/concave/server"
import {Effect as E, Option, pipe, Schema as S} from "effect"

import {mutation, MutationCtx, query, QueryCtx, schema} from "../concave"

const {model} = createModelFunction({schema, QueryCtx, MutationCtx})

const Item = model(
  "items",
  S.Struct({
    name: S.NonEmptyTrimmedString,
    category: S.NonEmptyString,
    status: S.Literal("active", "inactive"),
    priority: S.Number.pipe(S.positive()),
    value: S.Number,
    content: S.optional(S.String),
    createdAt: S.Number,
  }),
)

export const modelNormalizeId = query({
  args: S.Struct({idString: S.String}),
  handler: E.fn(function* (args) {
    return yield* Item.normalizeId(args.idString)
  }),
})

export const modelNormalizeIdNullable = query({
  args: S.Struct({idString: S.String}),
  handler: E.fn(function* (args) {
    return yield* Item.normalizeIdNullable(args.idString)
  }),
})

export const modelNormalizeIdOption = query({
  args: S.Struct({idString: S.String}),
  handler: E.fn(function* (args) {
    const result = yield* Item.normalizeIdOption(args.idString)
    return Option.getOrNull(result)
  }),
})

export const modelNormalizeIdWithFallback = query({
  args: S.Struct({idString: S.String}),
  handler: E.fn(function* (args) {
    return yield* pipe(
      Item.normalizeId(args.idString),
      E.catchTag("InvalidDocIdError", () => E.succeed("fallback-for-invalid-id")),
    )
  }),
})

export const modelGetById = query({
  args: S.Struct({id: SDocId("items")}),
  handler: E.fn(function* (args) {
    return yield* Item.getById(args.id)
  }),
})

export const modelGetByIdNullable = query({
  args: S.Struct({id: SDocId("items")}),
  handler: E.fn(function* (args) {
    return yield* Item.getByIdNullable(args.id)
  }),
})

export const modelGetByIdOption = query({
  args: S.Struct({id: SDocId("items")}),
  handler: E.fn(function* (args) {
    const result = yield* Item.getByIdOption(args.id)
    return Option.getOrNull(result)
  }),
})

export const modelGetByIdWithFallback = query({
  args: S.Struct({id: SDocId("items")}),
  handler: E.fn(function* (args) {
    return yield* pipe(
      Item.getById(args.id),
      E.catchTag("DocNotFoundError", () =>
        E.succeed({
          _id: args.id,
          _creationTime: 0,
          name: "Fallback Item",
          category: "fallback",
          status: "inactive" as const,
          priority: 1,
          value: 0,
          createdAt: 0,
        }),
      ),
    )
  }),
})

export const modelInsert = mutation({
  args: S.Struct({
    name: S.NonEmptyTrimmedString,
    category: S.NonEmptyString,
    status: S.Literal("active", "inactive"),
    priority: S.Number,
    value: S.Number,
    content: S.optional(S.String),
    createdAt: S.Number,
  }),
  handler: E.fn(function* (args) {
    return yield* Item.insert(args)
  }),
})

export const modelInsertAndGet = mutation({
  args: S.Struct({
    name: S.NonEmptyTrimmedString,
    category: S.NonEmptyString,
    status: S.Literal("active", "inactive"),
    priority: S.Number,
    value: S.Number,
    content: S.optional(S.String),
    createdAt: S.Number,
  }),
  handler: E.fn(function* (args) {
    return yield* Item.insertAndGet(args)
  }),
})

export const modelPatchById = mutation({
  args: S.Struct({
    id: SDocId("items"),
    name: S.optional(S.NonEmptyTrimmedString),
    category: S.optional(S.NonEmptyString),
    status: S.optional(S.Literal("active", "inactive")),
    priority: S.optional(S.Number.pipe(S.positive())),
    value: S.optional(S.Number),
    content: S.optional(S.String),
  }),
  handler: E.fn(function* (args) {
    const {id, ...updates} = args
    yield* Item.patchById(id, updates)
  }),
})

export const modelPatchByIdAndGet = mutation({
  args: S.Struct({
    id: SDocId("items"),
    name: S.optional(S.NonEmptyTrimmedString),
    category: S.optional(S.NonEmptyString),
    status: S.optional(S.Literal("active", "inactive")),
    priority: S.optional(S.Number.pipe(S.positive())),
    value: S.optional(S.Number),
    content: S.optional(S.String),
  }),
  handler: E.fn(function* (args) {
    const {id, ...updates} = args
    return yield* Item.patchByIdAndGet(id, updates)
  }),
})

export const modelReplaceById = mutation({
  args: S.Struct({
    id: SDocId("items"),
    name: S.NonEmptyTrimmedString,
    category: S.NonEmptyString,
    status: S.Literal("active", "inactive"),
    priority: S.Number,
    value: S.Number,
    content: S.optional(S.String),
    createdAt: S.Number,
  }),
  handler: E.fn(function* (args) {
    const {id, ...data} = args
    yield* Item.replaceById(id, data)
  }),
})

export const modelReplaceByIdAndGet = mutation({
  args: S.Struct({
    id: SDocId("items"),
    name: S.NonEmptyTrimmedString,
    category: S.NonEmptyString,
    status: S.Literal("active", "inactive"),
    priority: S.Number,
    value: S.Number,
    content: S.optional(S.String),
    createdAt: S.Number,
  }),
  handler: E.fn(function* (args) {
    const {id, ...data} = args
    return yield* Item.replaceByIdAndGet(id, data)
  }),
})

export const modelDeleteById = mutation({
  args: S.Struct({id: SDocId("items")}),
  handler: E.fn(function* (args) {
    yield* Item.deleteById(args.id)
  }),
})

export const modelCollect = query({
  args: S.Struct({}),
  handler: E.fn(function* () {
    return yield* pipe(yield* Item.query, Item.fullTableScan, Item.collect)
  }),
})

export const modelTake = query({
  args: S.Struct({n: S.Number}),
  handler: E.fn(function* (args) {
    return yield* pipe(yield* Item.query, Item.fullTableScan, Item.take(args.n))
  }),
})

export const modelFirst = query({
  args: S.Struct({}),
  handler: E.fn(function* () {
    const result = yield* pipe(yield* Item.query, Item.fullTableScan, Item.first)
    return Option.getOrNull(result)
  }),
})

export const modelUnique = query({
  args: S.Struct({category: S.String}),
  handler: E.fn(function* (args) {
    const result = yield* pipe(
      yield* Item.query,
      Item.withIndex("by_category", (q) => q.eq("category", args.category)),
      Item.unique,
    )
    return Option.getOrNull(result)
  }),
})

export const modelWithIndexFilterOrder = query({
  args: S.Struct({
    category: S.String,
    minPriority: S.Number,
    order: S.Literal("asc", "desc"),
  }),
  handler: E.fn(function* (args) {
    return yield* pipe(
      yield* Item.query,
      Item.withIndex("by_category", (q) => q.eq("category", args.category)),
      Item.filter((q) => q.gte(q.field("priority"), args.minPriority)),
      Item.order(args.order),
      Item.collect,
    )
  }),
})

export const modelPaginate = query({
  args: S.Struct({
    paginationOpts: S.Struct({
      numItems: S.Number,
      cursor: S.NullOr(S.String),
    }),
  }),
  handler: E.fn(function* (args) {
    return yield* pipe(yield* Item.query, Item.fullTableScan, Item.paginate(args.paginationOpts))
  }),
})

export const modelStreamCollect = query({
  args: S.Struct({}),
  handler: E.fn(function* () {
    return yield* pipe(
      yield* Item.stream,
      Item.withStreamIndex("by_creation_time"),
      Item.orderStream("asc"),
      Item.collectStream,
    )
  }),
})

export const modelStreamWithIndex = query({
  args: S.Struct({category: S.String}),
  handler: E.fn(function* (args) {
    return yield* pipe(
      yield* Item.stream,
      Item.withStreamIndex("by_category", (q) => q.eq("category", args.category)),
      Item.orderStream("asc"),
      Item.collectStream,
    )
  }),
})

export const modelFilterStreamWith = query({
  args: S.Struct({minValue: S.Number}),
  handler: E.fn(function* (args) {
    return yield* pipe(
      yield* Item.stream,
      Item.withStreamIndex("by_creation_time"),
      Item.orderStream("asc"),
      Item.filterStreamWith((doc) => E.succeed(doc.value >= args.minValue)),
      Item.collectStream,
    )
  }),
})

export const modelMapStream = query({
  args: S.Struct({}),
  handler: E.fn(function* () {
    return yield* pipe(
      yield* Item.stream,
      Item.withStreamIndex("by_creation_time"),
      Item.orderStream("asc"),
      Item.mapStream((doc) =>
        E.succeed({
          id: doc._id,
          name: doc.name,
          doubled: doc.value * 2,
        }),
      ),
      (stream) => stream.collect(),
    )
  }),
})

export const modelUniqueFromStream = query({
  args: S.Struct({category: S.String}),
  handler: E.fn(function* (args) {
    return yield* pipe(
      yield* Item.stream,
      Item.withStreamIndex("by_category", (q) => q.eq("category", args.category)),
      Item.orderStream("asc"),
      Item.uniqueFromStream,
      E.andThen(Option.getOrNull),
    )
  }),
})

export const modelStreamTake = query({
  args: S.Struct({n: S.Number}),
  handler: E.fn(function* (args) {
    return yield* pipe(
      yield* Item.stream,
      Item.withStreamIndex("by_creation_time"),
      Item.orderStream("asc"),
      Item.takeFromStream(args.n),
    )
  }),
})

export const modelStreamFirst = query({
  args: S.Struct({}),
  handler: E.fn(function* () {
    return yield* pipe(
      yield* Item.stream,
      Item.withStreamIndex("by_creation_time"),
      Item.orderStream("asc"),
      Item.firstFromStream,
      E.andThen(Option.getOrNull),
    )
  }),
})

export const modelStreamPaginate = query({
  args: S.Struct({
    paginationOpts: S.Struct({
      numItems: S.Number,
      cursor: S.NullOr(S.String),
    }),
  }),
  handler: E.fn(function* (args) {
    return yield* pipe(
      yield* Item.stream,
      Item.withStreamIndex("by_creation_time"),
      Item.orderStream("asc"),
      Item.paginateStream(args.paginationOpts),
    )
  }),
})
