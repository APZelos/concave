import type {Doc} from "../_generated/dataModel"

import {Effect as E, Schema as S} from "effect"

import {internal} from "../_generated/api"
import {SDocId} from "../../../src/server/values"
import {mutation, MutationCtx, query, QueryCtx} from "../concave"

export const getPost = query({
  args: S.Struct({
    id: SDocId("posts"),
  }),
  handler: E.fn(function* (args) {
    const {db} = yield* QueryCtx
    return yield* db.get(args.id)
  }),
})

export const listPostsByAuthor = query({
  args: S.Struct({
    authorId: SDocId("users"),
  }),
  handler: E.fn(function* (args) {
    const {db} = yield* QueryCtx
    return yield* db
      .query("posts")
      .withIndex("by_author", (q) => q.eq("authorId", args.authorId))
      .collect()
  }),
})

export const listPublishedPosts = query({
  args: S.Struct({}),
  handler: E.fn(function* () {
    const {db} = yield* QueryCtx
    return yield* db
      .query("posts")
      .withIndex("by_status", (q) => q.eq("status", "published"))
      .collect()
  }),
})

export const listPostsByAuthorAndStatus = query({
  args: S.Struct({
    authorId: SDocId("users"),
    status: S.Literal("draft", "published"),
  }),
  handler: E.fn(function* (args) {
    const {db} = yield* QueryCtx
    return yield* db
      .query("posts")
      .withIndex("by_author_and_status", (q) =>
        q.eq("authorId", args.authorId).eq("status", args.status),
      )
      .collect()
  }),
})

export const searchPosts = query({
  args: S.Struct({
    searchQuery: S.String,
  }),
  handler: E.fn(function* (args) {
    const {db} = yield* QueryCtx
    return yield* db
      .query("posts")
      .withSearchIndex("search_content", (q) => q.search("content", args.searchQuery))
      .collect()
  }),
})

export const searchPostsWithFilters = query({
  args: S.Struct({
    searchQuery: S.String,
    status: S.optional(S.Literal("draft", "published")),
  }),
  handler: E.fn(function* (args) {
    const {db} = yield* QueryCtx
    let query = db
      .query("posts")
      .withSearchIndex("search_content", (q) => q.search("content", args.searchQuery))

    if (args.status) {
      query = query.filter((q) => q.eq(q.field("status"), args.status))
    }

    return yield* query.collect()
  }),
})

export const getPostWithAuthor = query({
  args: S.Struct({
    id: SDocId("posts"),
  }),
  handler: E.fn(function* (args) {
    const ctx = yield* QueryCtx
    const post = yield* ctx.db.get(args.id)
    if (!post) return null

    const getAuthorEffect: E.Effect<Doc<"users"> | null> = ctx.runQuery(
      internal.functions.users.internalGetUser,
      {id: post.authorId},
    )
    const author = yield* getAuthorEffect

    return {post, author}
  }),
})

export const createPost = mutation({
  args: S.Struct({
    authorId: SDocId("users"),
    title: S.String,
    content: S.String,
  }),
  handler: E.fn(function* (args) {
    const {db} = yield* MutationCtx
    return yield* db.insert("posts", {
      authorId: args.authorId,
      title: args.title,
      content: args.content,
      status: "draft",
    })
  }),
})

export const publishPost = mutation({
  args: S.Struct({
    id: SDocId("posts"),
  }),
  handler: E.fn(function* (args) {
    const {db} = yield* MutationCtx
    yield* db.patch(args.id, {
      status: "published",
      publishedAt: Date.now(),
    })
  }),
})

export const updatePost = mutation({
  args: S.Struct({
    id: SDocId("posts"),
    title: S.optional(S.String),
    content: S.optional(S.String),
  }),
  handler: E.fn(function* (args) {
    const {db} = yield* MutationCtx
    const {id, ...updates} = args
    yield* db.patch(id, updates)
  }),
})
