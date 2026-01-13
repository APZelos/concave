import type {Doc, Id} from "../_generated/dataModel"

import {Effect as E, Schema as S} from "effect"

import {internal} from "../_generated/api"
import {SDocId} from "../../../src/server/values"
import {internalMutation, internalQuery, mutation, MutationCtx, query, QueryCtx} from "../concave"

export const getUser = query({
  args: S.Struct({
    id: SDocId("users"),
  }),
  handler: E.fn(function* (args) {
    const {db} = yield* QueryCtx
    return yield* db.get(args.id)
  }),
})

export const getUserByEmail = query({
  args: S.Struct({
    email: S.String,
  }),
  handler: E.fn(function* (args) {
    const {db} = yield* QueryCtx
    return yield* db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .unique()
  }),
})

export const listUsers = query({
  args: S.Struct({}),
  handler: E.fn(function* () {
    const {db} = yield* QueryCtx
    return yield* db.query("users").collect()
  }),
})

export const listUsersByRole = query({
  args: S.Struct({
    role: S.Literal("admin", "user"),
  }),
  handler: E.fn(function* (args) {
    const {db} = yield* QueryCtx
    return yield* db
      .query("users")
      .withIndex("by_role", (q) => q.eq("role", args.role))
      .collect()
  }),
})

export const listUsersOrdered = query({
  args: S.Struct({
    order: S.Literal("asc", "desc"),
  }),
  handler: E.fn(function* (args) {
    const {db} = yield* QueryCtx
    return yield* db.query("users").order(args.order).collect()
  }),
})

export const listUsersPaginated = query({
  args: S.Struct({
    paginationOpts: S.Struct({
      numItems: S.Number,
      cursor: S.NullOr(S.String),
    }),
  }),
  handler: E.fn(function* (args) {
    const {db} = yield* QueryCtx
    return yield* db.query("users").paginate(args.paginationOpts)
  }),
})

export const getFirstUser = query({
  args: S.Struct({}),
  handler: E.fn(function* () {
    const {db} = yield* QueryCtx
    return yield* db.query("users").first()
  }),
})

export const takeUsers = query({
  args: S.Struct({
    count: S.Number,
  }),
  handler: E.fn(function* (args) {
    const {db} = yield* QueryCtx
    return yield* db.query("users").take(args.count)
  }),
})

export const normalizeUserId = query({
  args: S.Struct({
    idString: S.String,
  }),
  handler: E.fn(function* (args) {
    const {db} = yield* QueryCtx
    return yield* db.normalizeId("users", args.idString)
  }),
})

export const createUser = mutation({
  args: S.Struct({
    name: S.String,
    email: S.String,
    role: S.Literal("admin", "user"),
  }),
  handler: E.fn(function* (args) {
    const {db} = yield* MutationCtx
    return yield* db.insert("users", {
      name: args.name,
      email: args.email,
      role: args.role,
      createdAt: Date.now(),
    })
  }),
})

export const updateUser = mutation({
  args: S.Struct({
    id: SDocId("users"),
    name: S.optional(S.String),
    email: S.optional(S.String),
    role: S.optional(S.Literal("admin", "user")),
  }),
  handler: E.fn(function* (args) {
    const {db} = yield* MutationCtx
    const {id, ...updates} = args
    yield* db.patch(id, updates)
  }),
})

export const replaceUser = mutation({
  args: S.Struct({
    id: SDocId("users"),
    name: S.String,
    email: S.String,
    role: S.Literal("admin", "user"),
    createdAt: S.Number,
  }),
  handler: E.fn(function* (args) {
    const {db} = yield* MutationCtx
    const {id, ...data} = args
    yield* db.replace(id, data)
  }),
})

export const deleteUser = mutation({
  args: S.Struct({
    id: SDocId("users"),
  }),
  handler: E.fn(function* (args) {
    const {db} = yield* MutationCtx
    yield* db.delete(args.id)
  }),
})

export const createAndGetUser = mutation({
  args: S.Struct({
    name: S.String,
    email: S.String,
    role: S.Literal("admin", "user"),
  }),
  handler: E.fn(function* (args) {
    const ctx = yield* MutationCtx

    const createUserEffect: E.Effect<Id<"users">> = ctx.runMutation(
      internal.functions.users.internalCreateUser,
      {
        name: args.name,
        email: args.email,
        role: args.role,
      },
    )

    const userId = yield* createUserEffect

    const getUserEffect: E.Effect<Doc<"users"> | null> = ctx.runQuery(
      internal.functions.users.internalGetUser,
      {id: userId},
    )

    return yield* getUserEffect
  }),
})

export const internalGetUser = internalQuery({
  args: S.Struct({
    id: SDocId("users"),
  }),
  handler: E.fn(function* (args) {
    const {db} = yield* QueryCtx
    return yield* db.get(args.id)
  }),
})

export const internalCreateUser = internalMutation({
  args: S.Struct({
    name: S.String,
    email: S.String,
    role: S.Literal("admin", "user"),
  }),
  handler: E.fn(function* (args) {
    const {db} = yield* MutationCtx
    return yield* db.insert("users", {
      name: args.name,
      email: args.email,
      role: args.role,
      createdAt: Date.now(),
    })
  }),
})
