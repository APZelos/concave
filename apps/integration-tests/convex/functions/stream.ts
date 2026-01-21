import {
  collectStream,
  filterStreamWith,
  mapStream,
  mergedStream,
  stream,
} from "@apzelos/concave-helpers/server/stream"
import {Data, Effect as E, pipe, Schema as S} from "effect"

import {query, QueryCtx, schema} from "../concave"

export class TransformError extends Data.TaggedError("TransformError")<{
  itemName: string
  reason: string
}> {}

export const streamFullTableScan = query({
  args: S.Struct({}),
  handler: E.fn(function* () {
    const ctx = yield* QueryCtx
    return yield* stream(QueryCtx, ctx, schema).query("items").fullTableScan().collect()
  }),
})

export const streamWithIndex = query({
  args: S.Struct({
    category: S.String,
  }),
  handler: E.fn(function* (args) {
    const ctx = yield* QueryCtx
    return yield* stream(QueryCtx, ctx, schema)
      .query("items")
      .withIndex("by_category", (q) => q.eq("category", args.category))
      .collect()
  }),
})

export const streamWithCompoundIndex = query({
  args: S.Struct({
    category: S.String,
    status: S.Literal("active", "inactive"),
  }),
  handler: E.fn(function* (args) {
    const ctx = yield* QueryCtx
    return yield* stream(QueryCtx, ctx, schema)
      .query("items")
      .withIndex("by_category_status", (q) =>
        q.eq("category", args.category).eq("status", args.status),
      )
      .collect()
  }),
})

export const streamOrderAsc = query({
  args: S.Struct({}),
  handler: E.fn(function* () {
    const ctx = yield* QueryCtx
    return yield* stream(QueryCtx, ctx, schema).query("items").order("asc").collect()
  }),
})

export const streamOrderDesc = query({
  args: S.Struct({}),
  handler: E.fn(function* () {
    const ctx = yield* QueryCtx
    return yield* stream(QueryCtx, ctx, schema).query("items").order("desc").collect()
  }),
})

export const streamCollect = query({
  args: S.Struct({}),
  handler: E.fn(function* () {
    const ctx = yield* QueryCtx
    return yield* stream(QueryCtx, ctx, schema).query("items").fullTableScan().collect()
  }),
})

export const streamTake = query({
  args: S.Struct({
    n: S.Number,
  }),
  handler: E.fn(function* (args) {
    const ctx = yield* QueryCtx
    return yield* stream(QueryCtx, ctx, schema).query("items").fullTableScan().take(args.n)
  }),
})

export const streamFirst = query({
  args: S.Struct({}),
  handler: E.fn(function* () {
    const ctx = yield* QueryCtx
    return yield* stream(QueryCtx, ctx, schema).query("items").fullTableScan().first()
  }),
})

export const streamUnique = query({
  args: S.Struct({
    category: S.String,
  }),
  handler: E.fn(function* (args) {
    const ctx = yield* QueryCtx
    return yield* stream(QueryCtx, ctx, schema)
      .query("items")
      .withIndex("by_category", (q) => q.eq("category", args.category))
      .unique()
  }),
})

export const streamFilterWith = query({
  args: S.Struct({
    minValue: S.Number,
  }),
  handler: E.fn(function* (args) {
    const ctx = yield* QueryCtx
    return yield* stream(QueryCtx, ctx, schema)
      .query("items")
      .fullTableScan()
      .filterWith((item) => E.succeed(item.value >= args.minValue))
      .collect()
  }),
})

export const streamFilterWithDbLookup = query({
  args: S.Struct({
    requiredDetailInfo: S.String,
  }),
  handler: E.fn(function* (args) {
    const ctx = yield* QueryCtx
    return yield* stream(QueryCtx, ctx, schema)
      .query("items")
      .fullTableScan()
      .filterWith((item) =>
        E.gen(function* () {
          const {db} = yield* QueryCtx
          const details = yield* db
            .query("details")
            .withIndex("by_item", (q) => q.eq("itemId", item._id))
            .collect()
          return details.some((d) => d.info === args.requiredDetailInfo)
        }),
      )
      .collect()
  }),
})

export const streamMap = query({
  args: S.Struct({}),
  handler: E.fn(function* () {
    const ctx = yield* QueryCtx
    return yield* stream(QueryCtx, ctx, schema)
      .query("items")
      .fullTableScan()
      .map((item) => E.succeed({id: item._id, name: item.name, doubled: item.value * 2}))
      .collect()
  }),
})

export const streamMapWithNull = query({
  args: S.Struct({
    filterCategory: S.String,
  }),
  handler: E.fn(function* (args) {
    const ctx = yield* QueryCtx
    return yield* stream(QueryCtx, ctx, schema)
      .query("items")
      .fullTableScan()
      .map((item) =>
        E.succeed(item.category === args.filterCategory ? {id: item._id, name: item.name} : null),
      )
      .collect()
  }),
})

export const streamFlatMap = query({
  args: S.Struct({}),
  handler: E.fn(function* () {
    const ctx = yield* QueryCtx
    return yield* stream(QueryCtx, ctx, schema)
      .query("items")
      .fullTableScan()
      .flatMap(
        (item) =>
          E.succeed(
            stream(QueryCtx, ctx, schema)
              .query("details")
              .withIndex("by_item", (q) => q.eq("itemId", item._id)),
          ),
        ["itemId"],
      )
      .collect()
  }),
})

export const streamDistinct = query({
  args: S.Struct({}),
  handler: E.fn(function* () {
    const ctx = yield* QueryCtx
    return yield* stream(QueryCtx, ctx, schema)
      .query("items")
      .withIndex("by_category")
      .distinct(["category"])
      .collect()
  }),
})

export const streamPaginate = query({
  args: S.Struct({
    paginationOpts: S.Struct({
      numItems: S.Number,
      cursor: S.NullOr(S.String),
    }),
  }),
  handler: E.fn(function* (args) {
    const ctx = yield* QueryCtx
    return yield* stream(QueryCtx, ctx, schema)
      .query("items")
      .fullTableScan()
      .paginate(args.paginationOpts)
  }),
})

export const streamMerged = query({
  args: S.Struct({
    categories: S.Array(S.String),
  }),
  handler: E.fn(function* (args) {
    const ctx = yield* QueryCtx
    const streams = args.categories.map((category) =>
      stream(QueryCtx, ctx, schema)
        .query("items")
        .withIndex("by_category", (q) => q.eq("category", category)),
    )
    return yield* mergedStream(streams, ["category"]).collect()
  }),
})

export const streamWithValueIndex = query({
  args: S.Struct({
    minValue: S.Number,
    maxValue: S.Number,
  }),
  handler: E.fn(function* (args) {
    const ctx = yield* QueryCtx
    return yield* stream(QueryCtx, ctx, schema)
      .query("items")
      .withIndex("by_value", (q) => q.gte("value", args.minValue).lte("value", args.maxValue))
      .collect()
  }),
})

export const streamChainedMaps = query({
  args: S.Struct({}),
  handler: E.fn(function* () {
    const ctx = yield* QueryCtx
    return yield* stream(QueryCtx, ctx, schema)
      .query("items")
      .fullTableScan()
      .map((item) => E.succeed({name: item.name, value: item.value}))
      .map((item) => E.succeed({...item, name: item.name.toUpperCase()}))
      .map((item) => E.succeed({...item, label: `Item: ${item.name}`}))
      .collect()
  }),
})

export const streamMapFilterMap = query({
  args: S.Struct({minValue: S.Number}),
  handler: E.fn(function* (args) {
    const ctx = yield* QueryCtx
    return yield* stream(QueryCtx, ctx, schema)
      .query("items")
      .fullTableScan()
      .map((item) => E.succeed({id: item._id, doubled: item.value * 2, name: item.name}))
      .filterWith((item) => E.succeed(item.doubled >= args.minValue))
      .map((item) => E.succeed({...item, label: `[${item.doubled}] ${item.name}`}))
      .collect()
  }),
})

export const streamMapWithError = query({
  args: S.Struct({failOnName: S.String}),
  handler: E.fn(function* (args) {
    const ctx = yield* QueryCtx
    return yield* stream(QueryCtx, ctx, schema)
      .query("items")
      .fullTableScan()
      .map(
        E.fn(function* (item) {
          if (item.name === args.failOnName) {
            return yield* new TransformError({
              itemName: item.name,
              reason: "Matched fail condition",
            })
          }
          return {id: item._id, name: item.name}
        }),
      )
      .collect()
  }),
})

export const streamChainedMapWithMiddleError = query({
  args: S.Struct({failOnValue: S.Number}),
  handler: E.fn(function* (args) {
    const ctx = yield* QueryCtx
    return yield* stream(QueryCtx, ctx, schema)
      .query("items")
      .fullTableScan()
      .map((item) => E.succeed({name: item.name, value: item.value}))
      .map(
        E.fn(function* (item) {
          if (item.value === args.failOnValue) {
            return yield* new TransformError({itemName: item.name, reason: "Value matched"})
          }
          return {...item, doubled: item.value * 2}
        }),
      )
      .map((item) => E.succeed({...item, label: `Value: ${item.doubled}`}))
      .collect()
  }),
})

export const streamMapWithRecovery = query({
  args: S.Struct({failOnName: S.String}),
  handler: E.fn(function* (args) {
    const ctx = yield* QueryCtx
    return yield* stream(QueryCtx, ctx, schema)
      .query("items")
      .fullTableScan()
      .map(
        E.fn(function* (item) {
          if (item.name === args.failOnName) {
            return yield* pipe(
              new TransformError({itemName: item.name, reason: "Matched"}),
              E.catchTag("TransformError", (err) =>
                E.succeed({id: item._id, name: `RECOVERED: ${err.itemName}`, recovered: true}),
              ),
            )
          }
          return {id: item._id, name: item.name, recovered: false}
        }),
      )
      .collect()
  }),
})

export const streamMapWithDbGet = query({
  args: S.Struct({}),
  handler: E.fn(function* () {
    const ctx = yield* QueryCtx
    return yield* stream(QueryCtx, ctx, schema)
      .query("details")
      .fullTableScan()
      .map(
        E.fn(function* (detail) {
          const {db} = yield* QueryCtx
          const item = yield* db.get(detail.itemId)
          return {detailInfo: detail.info, itemName: item?.name ?? "Unknown"}
        }),
      )
      .collect()
  }),
})

export const streamMapWithDbQuery = query({
  args: S.Struct({}),
  handler: E.fn(function* () {
    const ctx = yield* QueryCtx
    return yield* stream(QueryCtx, ctx, schema)
      .query("items")
      .fullTableScan()
      .map(
        E.fn(function* (item) {
          const {db} = yield* QueryCtx
          const details = yield* db
            .query("details")
            .withIndex("by_item", (q) => q.eq("itemId", item._id))
            .collect()
          return {id: item._id, name: item.name, detailCount: details.length}
        }),
      )
      .collect()
  }),
})

export const streamPipeWithMapHelper = query({
  args: S.Struct({}),
  handler: E.fn(function* () {
    const ctx = yield* QueryCtx
    return yield* pipe(
      stream(QueryCtx, ctx, schema).query("items").fullTableScan(),
      mapStream((item) => E.succeed({id: item._id, upperName: item.name.toUpperCase()})),
      collectStream,
    )
  }),
})

export const streamPipeWithCombinedHelpers = query({
  args: S.Struct({minValue: S.Number}),
  handler: E.fn(function* (args) {
    const ctx = yield* QueryCtx
    return yield* pipe(
      stream(QueryCtx, ctx, schema).query("items").fullTableScan(),
      filterStreamWith((item) => E.succeed(item.value >= args.minValue)),
      mapStream((item) => E.succeed({id: item._id, name: item.name, value: item.value})),
      collectStream,
    )
  }),
})

export const streamPipeWithChainedMapHelpers = query({
  args: S.Struct({}),
  handler: E.fn(function* () {
    const ctx = yield* QueryCtx
    return yield* pipe(
      stream(QueryCtx, ctx, schema).query("items").fullTableScan(),
      mapStream((item) => E.succeed({name: item.name, value: item.value})),
      mapStream((item) => E.succeed({...item, doubled: item.value * 2})),
      collectStream,
    )
  }),
})

export const streamMapAllToNull = query({
  args: S.Struct({}),
  handler: E.fn(function* () {
    const ctx = yield* QueryCtx
    return yield* stream(QueryCtx, ctx, schema)
      .query("items")
      .fullTableScan()
      .map(() => E.succeed(null))
      .collect()
  }),
})

export const streamMapSomeToNull = query({
  args: S.Struct({keepCategory: S.String}),
  handler: E.fn(function* (args) {
    const ctx = yield* QueryCtx
    return yield* stream(QueryCtx, ctx, schema)
      .query("items")
      .fullTableScan()
      .map((item) =>
        E.succeed(item.category === args.keepCategory ? {id: item._id, name: item.name} : null),
      )
      .collect()
  }),
})
