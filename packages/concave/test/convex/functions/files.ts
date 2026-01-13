import {Effect as E, Schema as S} from "effect"

import {SDocId} from "../../../src/server/values"
import {mutation, MutationCtx, query, QueryCtx} from "../concave"

export const getFileUrl = query({
  args: S.Struct({
    storageId: SDocId("_storage"),
  }),
  handler: E.fn(function* (args) {
    const {storage} = yield* QueryCtx
    return yield* storage.getUrl(args.storageId)
  }),
})

export const getFileMetadata = query({
  args: S.Struct({
    id: SDocId("files"),
  }),
  handler: E.fn(function* (args) {
    const {db} = yield* QueryCtx
    return yield* db.get(args.id)
  }),
})

export const listFilesByUploader = query({
  args: S.Struct({
    uploaderId: SDocId("users"),
  }),
  handler: E.fn(function* (args) {
    const {db} = yield* QueryCtx
    return yield* db
      .query("files")
      .withIndex("by_uploader", (q) => q.eq("uploadedBy", args.uploaderId))
      .collect()
  }),
})

export const generateUploadUrl = mutation({
  args: S.Struct({}),
  handler: E.fn(function* () {
    const {storage} = yield* MutationCtx
    return yield* storage.generateUploadUrl()
  }),
})

export const createFileRecord = mutation({
  args: S.Struct({
    storageId: SDocId("_storage"),
    uploadedBy: SDocId("users"),
    filename: S.String,
    contentType: S.String,
    size: S.Number,
  }),
  handler: E.fn(function* (args) {
    const {db} = yield* MutationCtx
    return yield* db.insert("files", {
      storageId: args.storageId,
      uploadedBy: args.uploadedBy,
      filename: args.filename,
      contentType: args.contentType,
      size: args.size,
    })
  }),
})

export const deleteFile = mutation({
  args: S.Struct({
    id: SDocId("files"),
  }),
  handler: E.fn(function* (args) {
    const ctx = yield* MutationCtx
    const file = yield* ctx.db.get(args.id)
    if (file) {
      yield* ctx.storage.delete(file.storageId)
      yield* ctx.db.delete(args.id)
    }
  }),
})

export const deleteStorageFile = mutation({
  args: S.Struct({
    storageId: SDocId("_storage"),
  }),
  handler: E.fn(function* (args) {
    const {storage} = yield* MutationCtx
    yield* storage.delete(args.storageId)
  }),
})
