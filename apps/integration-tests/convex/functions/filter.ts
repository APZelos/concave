import {filter} from "@apzelos/concave-helpers/server/filter"
import {Effect as E, Schema as S} from "effect"

import {query, QueryCtx} from "../concave"

export const filterByPriority = query({
  args: S.Struct({
    minPriority: S.Number,
  }),
  handler: E.fn(function* (args) {
    const {db} = yield* QueryCtx
    const q = db.query("items")
    return yield* filter(q, (item) => item.priority >= args.minPriority).collect()
  }),
})

export const filterByStatus = query({
  args: S.Struct({
    status: S.Literal("active", "inactive"),
  }),
  handler: E.fn(function* (args) {
    const {db} = yield* QueryCtx
    const q = db.query("items")
    return yield* filter(q, (item) => item.status === args.status).collect()
  }),
})

export const filterByCategory = query({
  args: S.Struct({
    category: S.String,
  }),
  handler: E.fn(function* (args) {
    const {db} = yield* QueryCtx
    const q = db.query("items")
    return yield* filter(q, (item) => item.category === args.category).collect()
  }),
})

export const filterByMultipleConditions = query({
  args: S.Struct({
    category: S.String,
    minPriority: S.Number,
    status: S.Literal("active", "inactive"),
  }),
  handler: E.fn(function* (args) {
    const {db} = yield* QueryCtx
    const q = db.query("items")
    return yield* filter(
      q,
      (item) =>
        item.category === args.category &&
        item.priority >= args.minPriority &&
        item.status === args.status,
    ).collect()
  }),
})

export const filterWithContentSearch = query({
  args: S.Struct({
    searchTerm: S.String,
  }),
  handler: E.fn(function* (args) {
    const {db} = yield* QueryCtx
    const q = db.query("items")
    return yield* filter(q, (item) => item.content?.includes(args.searchTerm) ?? false).collect()
  }),
})

export const filterChainedWithCollect = query({
  args: S.Struct({
    minValue: S.Number,
  }),
  handler: E.fn(function* (args) {
    const {db} = yield* QueryCtx
    const q = db.query("items").withIndex("by_value")
    return yield* filter(q, (item) => item.value >= args.minValue).collect()
  }),
})
