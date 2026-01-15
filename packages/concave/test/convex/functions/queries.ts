import {Data, Effect as E, Schema as S} from "effect"

import {internal} from "../_generated/api"
import {SDocId} from "../../../src/server/values"
import {internalQuery, query, QueryCtx} from "../concave"

export class NotAuthenticatedError extends Data.TaggedError("NotAuthenticatedError") {}

export class QueryTaggedError extends Data.TaggedError("QueryTaggedError")<{
  message: string
}> {}

export const queryNoArgs = query({
  args: S.Struct({}),
  handler: E.fn(function* () {
    return "no args result"
  }),
})

export const queryNoArgsWithReturns = query({
  args: S.Struct({}),
  returns: S.String,
  handler: E.fn(function* () {
    return "validated return"
  }),
})

export const queryWithArgs = query({
  args: S.Struct({
    name: S.String,
    count: S.Number,
  }),
  handler: E.fn(function* (args) {
    return `${args.name}: ${args.count}`
  }),
})

export const queryWithArgsWithReturns = query({
  args: S.Struct({
    value: S.Number,
  }),
  returns: S.Struct({
    doubled: S.Number,
    original: S.Number,
  }),
  handler: E.fn(function* (args) {
    return {
      doubled: args.value * 2,
      original: args.value,
    }
  }),
})

export const queryNoAuthRequired = query({
  args: S.Struct({}),
  handler: E.fn(function* () {
    return "public query"
  }),
})

export const queryAuthRequired = query({
  args: S.Struct({}),
  handler: E.fn(function* () {
    const {auth} = yield* QueryCtx
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

export const queryGetIdentity = query({
  args: S.Struct({}),
  handler: E.fn(function* () {
    const {auth} = yield* QueryCtx
    return yield* auth.getUserIdentity()
  }),
})

export const queryThrowsTaggedError = query({
  args: S.Struct({
    message: S.String,
  }),
  handler: E.fn(function* (args) {
    return yield* new QueryTaggedError({message: args.message})
  }),
})

export const queryThrowsRegularError = query({
  args: S.Struct({
    message: S.String,
  }),
  handler: E.fn(function* (args) {
    throw new Error(args.message)
  }),
})

export const queryCallsQuery = query({
  args: S.Struct({
    value: S.Number,
  }),
  handler: E.fn(function* (args) {
    const ctx = yield* QueryCtx
    const Eresult: E.Effect<string> = ctx.runQuery(
      internal.functions.queries.internalQueryWithArgs,
      {
        value: args.value,
      },
    )
    const result = yield* Eresult
    return `called: ${result}`
  }),
})

export const queryFullTableScan = query({
  args: S.Struct({}),
  handler: E.fn(function* () {
    const {db} = yield* QueryCtx
    return yield* db.query("items").collect()
  }),
})

export const queryWithOrderAsc = query({
  args: S.Struct({}),
  handler: E.fn(function* () {
    const {db} = yield* QueryCtx
    return yield* db.query("items").order("asc").collect()
  }),
})

export const queryWithOrderDesc = query({
  args: S.Struct({}),
  handler: E.fn(function* () {
    const {db} = yield* QueryCtx
    return yield* db.query("items").order("desc").collect()
  }),
})

export const queryWithTake = query({
  args: S.Struct({
    count: S.Number,
  }),
  handler: E.fn(function* (args) {
    const {db} = yield* QueryCtx
    return yield* db.query("items").take(args.count)
  }),
})

export const queryFirst = query({
  args: S.Struct({}),
  handler: E.fn(function* () {
    const {db} = yield* QueryCtx
    return yield* db.query("items").first()
  }),
})

export const queryWithIndex = query({
  args: S.Struct({
    category: S.String,
  }),
  handler: E.fn(function* (args) {
    const {db} = yield* QueryCtx
    return yield* db
      .query("items")
      .withIndex("by_category", (q) => q.eq("category", args.category))
      .collect()
  }),
})

export const queryUnique = query({
  args: S.Struct({
    category: S.String,
  }),
  handler: E.fn(function* (args) {
    const {db} = yield* QueryCtx
    return yield* db
      .query("items")
      .withIndex("by_category", (q) => q.eq("category", args.category))
      .unique()
  }),
})

export const queryPaginate = query({
  args: S.Struct({
    paginationOpts: S.Struct({
      numItems: S.Number,
      cursor: S.NullOr(S.String),
    }),
  }),
  handler: E.fn(function* (args) {
    const {db} = yield* QueryCtx
    return yield* db.query("items").paginate(args.paginationOpts)
  }),
})

export const queryCompoundIndex = query({
  args: S.Struct({
    category: S.String,
    status: S.Literal("active", "inactive"),
  }),
  handler: E.fn(function* (args) {
    const {db} = yield* QueryCtx
    return yield* db
      .query("items")
      .withIndex("by_category_status", (q) =>
        q.eq("category", args.category).eq("status", args.status),
      )
      .collect()
  }),
})

export const queryCompoundIndexPartial = query({
  args: S.Struct({
    category: S.String,
  }),
  handler: E.fn(function* (args) {
    const {db} = yield* QueryCtx
    return yield* db
      .query("items")
      .withIndex("by_category_status", (q) => q.eq("category", args.category))
      .collect()
  }),
})

export const querySearch = query({
  args: S.Struct({
    searchText: S.String,
  }),
  handler: E.fn(function* (args) {
    const {db} = yield* QueryCtx
    return yield* db
      .query("items")
      .withSearchIndex("search_content", (q) => q.search("content", args.searchText))
      .collect()
  }),
})

export const querySearchWithFilter = query({
  args: S.Struct({
    searchText: S.String,
    category: S.String,
  }),
  handler: E.fn(function* (args) {
    const {db} = yield* QueryCtx
    return yield* db
      .query("items")
      .withSearchIndex("search_content", (q) =>
        q.search("content", args.searchText).eq("category", args.category),
      )
      .collect()
  }),
})

export const queryWithFilter = query({
  args: S.Struct({
    minPriority: S.Number,
  }),
  handler: E.fn(function* (args) {
    const {db} = yield* QueryCtx
    return yield* db
      .query("items")
      .filter((q) => q.gte(q.field("priority"), args.minPriority))
      .collect()
  }),
})

export const queryGet = query({
  args: S.Struct({
    id: SDocId("items"),
  }),
  handler: E.fn(function* (args) {
    const {db} = yield* QueryCtx
    return yield* db.get(args.id)
  }),
})

export const queryNormalizeId = query({
  args: S.Struct({
    idString: S.String,
  }),
  handler: E.fn(function* (args) {
    const {db} = yield* QueryCtx
    return yield* db.normalizeId("items", args.idString)
  }),
})

export const internalQueryNoArgs = internalQuery({
  args: S.Struct({}),
  handler: E.fn(function* () {
    return "internal no args"
  }),
})

export const internalQueryWithArgs = internalQuery({
  args: S.Struct({
    value: S.Number,
  }),
  handler: E.fn(function* (args) {
    return `internal: ${args.value * 2}`
  }),
})
