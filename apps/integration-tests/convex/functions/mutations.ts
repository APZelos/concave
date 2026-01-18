import type {Id} from "../_generated/dataModel"

import {SDocId} from "@apzelos/concave/server"
import {Data, Effect as E, Schema as S} from "effect"

import {internal} from "../_generated/api"
import {internalMutation, mutation, MutationCtx} from "../concave"

export class NotAuthenticatedError extends Data.TaggedError("NotAuthenticatedError") {}

export class MutationTaggedError extends Data.TaggedError("MutationTaggedError")<{
  message: string
}> {}

export const mutationNoArgs = mutation({
  args: S.Struct({}),
  handler: E.fn(function* () {
    return "mutation no args result"
  }),
})

export const mutationNoArgsWithReturns = mutation({
  args: S.Struct({}),
  returns: S.String,
  handler: E.fn(function* () {
    return "validated mutation return"
  }),
})

export const mutationWithArgs = mutation({
  args: S.Struct({
    name: S.String,
    count: S.Number,
  }),
  handler: E.fn(function* (args) {
    return `mutation: ${args.name}: ${args.count}`
  }),
})

export const mutationWithArgsWithReturns = mutation({
  args: S.Struct({
    value: S.Number,
  }),
  returns: S.Struct({
    tripled: S.Number,
    original: S.Number,
  }),
  handler: E.fn(function* (args) {
    return {
      tripled: args.value * 3,
      original: args.value,
    }
  }),
})

export const mutationNoAuthRequired = mutation({
  args: S.Struct({}),
  handler: E.fn(function* () {
    return "public mutation"
  }),
})

export const mutationAuthRequired = mutation({
  args: S.Struct({}),
  handler: E.fn(function* () {
    const {auth} = yield* MutationCtx
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

export const mutationGetIdentity = mutation({
  args: S.Struct({}),
  handler: E.fn(function* () {
    const {auth} = yield* MutationCtx
    return yield* auth.getUserIdentity()
  }),
})

export const mutationThrowsTaggedError = mutation({
  args: S.Struct({
    message: S.String,
  }),
  handler: E.fn(function* (args) {
    return yield* new MutationTaggedError({message: args.message})
  }),
})

export const mutationThrowsRegularError = mutation({
  args: S.Struct({
    message: S.String,
  }),
  handler: E.fn(function* (args) {
    throw new Error(args.message)
  }),
})

export const mutationCallsQuery = mutation({
  args: S.Struct({
    value: S.Number,
  }),
  handler: E.fn(function* (args) {
    const ctx = yield* MutationCtx
    const Eresult: E.Effect<string> = ctx.runQuery(
      internal.functions.queries.internalQueryWithArgs,
      {
        value: args.value,
      },
    )
    const result = yield* Eresult
    return `mutation called query: ${result}`
  }),
})

export const mutationCallsMutation = mutation({
  args: S.Struct({
    name: S.String,
  }),
  handler: E.fn(function* (args) {
    const ctx = yield* MutationCtx
    const Eid: E.Effect<Id<"items">> = ctx.runMutation(
      internal.functions.mutations.internalMutationInsert,
      {
        name: args.name,
      },
    )
    return yield* Eid
  }),
})

export const mutationInsert = mutation({
  args: S.Struct({
    name: S.String,
    category: S.String,
    status: S.Literal("active", "inactive"),
    priority: S.Number,
    content: S.optional(S.String),
  }),
  handler: E.fn(function* (args) {
    const {db} = yield* MutationCtx
    return yield* db.insert("items", {
      name: args.name,
      category: args.category,
      status: args.status,
      priority: args.priority,
      value: 0,
      content: args.content,
      createdAt: Date.now(),
    })
  }),
})

export const mutationGet = mutation({
  args: S.Struct({
    id: SDocId("items"),
  }),
  handler: E.fn(function* (args) {
    const {db} = yield* MutationCtx
    return yield* db.get(args.id)
  }),
})

export const mutationPatch = mutation({
  args: S.Struct({
    id: SDocId("items"),
    name: S.optional(S.String),
    category: S.optional(S.String),
    status: S.optional(S.Literal("active", "inactive")),
    priority: S.optional(S.Number),
    content: S.optional(S.String),
  }),
  handler: E.fn(function* (args) {
    const {db} = yield* MutationCtx
    const {id, ...updates} = args
    yield* db.patch(id, updates)
  }),
})

export const mutationReplace = mutation({
  args: S.Struct({
    id: SDocId("items"),
    name: S.String,
    category: S.String,
    status: S.Literal("active", "inactive"),
    priority: S.Number,
    content: S.optional(S.String),
    createdAt: S.Number,
  }),
  handler: E.fn(function* (args) {
    const {db} = yield* MutationCtx
    const {id, ...data} = args
    yield* db.replace(id, {...data, value: 0})
  }),
})

export const mutationDelete = mutation({
  args: S.Struct({
    id: SDocId("items"),
  }),
  handler: E.fn(function* (args) {
    const {db} = yield* MutationCtx
    yield* db.delete(args.id)
  }),
})

export const mutationNormalizeId = mutation({
  args: S.Struct({
    idString: S.String,
  }),
  handler: E.fn(function* (args) {
    const {db} = yield* MutationCtx
    return yield* db.normalizeId("items", args.idString)
  }),
})

export const internalMutationNoArgs = internalMutation({
  args: S.Struct({}),
  handler: E.fn(function* () {
    return "internal mutation no args"
  }),
})

export const internalMutationWithArgs = internalMutation({
  args: S.Struct({
    value: S.Number,
  }),
  handler: E.fn(function* (args) {
    return `internal mutation: ${args.value * 3}`
  }),
})

export const internalMutationInsert = internalMutation({
  args: S.Struct({
    name: S.String,
  }),
  handler: E.fn(function* (args) {
    const {db} = yield* MutationCtx
    return yield* db.insert("items", {
      name: args.name,
      category: "internal",
      status: "active",
      priority: 0,
      value: 0,
      createdAt: Date.now(),
    })
  }),
})

export const mutationWithNumberFromString = mutation({
  args: S.Struct({value: S.NumberFromString}),
  handler: E.fn(function* (args) {
    return `mutation received: ${args.value * 2}`
  }),
})

export const mutationWithDateTransformation = mutation({
  args: S.Struct({
    name: S.String,
    createdAtString: S.DateFromString,
  }),
  handler: E.fn(function* (args) {
    const {db} = yield* MutationCtx
    return yield* db.insert("items", {
      name: args.name,
      category: "dated",
      status: "active",
      priority: 1,
      value: 0,
      createdAt: args.createdAtString.getTime(),
    })
  }),
})

export const mutationReturnsNumber = mutation({
  args: S.Struct({value: S.Number}),
  returns: S.NumberFromString,
  handler: E.fn(function* (args) {
    return String(args.value * 2)
  }),
})

// Helper mutations for stream/filter tests
export const mutationInsertWithValue = mutation({
  args: S.Struct({
    name: S.String,
    category: S.String,
    status: S.Literal("active", "inactive"),
    priority: S.Number,
    value: S.Number,
    content: S.optional(S.String),
  }),
  handler: E.fn(function* (args) {
    const {db} = yield* MutationCtx
    return yield* db.insert("items", {
      name: args.name,
      category: args.category,
      status: args.status,
      priority: args.priority,
      value: args.value,
      content: args.content,
      createdAt: Date.now(),
    })
  }),
})

export const mutationInsertDetail = mutation({
  args: S.Struct({
    itemId: SDocId("items"),
    info: S.String,
  }),
  handler: E.fn(function* (args) {
    const {db} = yield* MutationCtx
    return yield* db.insert("details", {
      itemId: args.itemId,
      info: args.info,
    })
  }),
})
