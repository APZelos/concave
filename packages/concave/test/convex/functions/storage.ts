import {Data, Effect as E, Schema as S} from "effect"

import {SDocId} from "../../../src/server/values"
import {action, ActionCtx, mutation, MutationCtx, query, QueryCtx} from "../concave"

export class NotAuthenticatedError extends Data.TaggedError("NotAuthenticatedError") {}

export const storageGetUrl = query({
  args: S.Struct({
    storageId: SDocId("_storage"),
  }),
  handler: E.fn(function* (args) {
    const {storage} = yield* QueryCtx
    return yield* storage
      .getUrl(args.storageId)
      .pipe(E.catchTag("FileNotFoundError", () => E.succeed(null)))
  }),
})

export const storageGetFileRecord = query({
  args: S.Struct({
    id: SDocId("files"),
  }),
  handler: E.fn(function* (args) {
    const {db} = yield* QueryCtx
    return yield* db.get(args.id)
  }),
})

export const storageListFiles = query({
  args: S.Struct({}),
  handler: E.fn(function* () {
    const {db} = yield* QueryCtx
    return yield* db.query("files").collect()
  }),
})

export const storageGenerateUploadUrl = mutation({
  args: S.Struct({}),
  handler: E.fn(function* () {
    const {storage} = yield* MutationCtx
    return yield* storage.generateUploadUrl()
  }),
})

export const storageDelete = mutation({
  args: S.Struct({
    storageId: SDocId("_storage"),
  }),
  handler: E.fn(function* (args) {
    const {storage} = yield* MutationCtx
    yield* storage.delete(args.storageId)
  }),
})

export const storageCreateFileRecord = mutation({
  args: S.Struct({
    storageId: SDocId("_storage"),
    filename: S.String,
    size: S.Number,
  }),
  handler: E.fn(function* (args) {
    const {db} = yield* MutationCtx
    return yield* db.insert("files", {
      storageId: args.storageId,
      filename: args.filename,
      size: args.size,
    })
  }),
})

export const storageDeleteFileRecord = mutation({
  args: S.Struct({
    id: SDocId("files"),
  }),
  handler: E.fn(function* (args) {
    const {db} = yield* MutationCtx
    yield* db.delete(args.id)
  }),
})

export const storageDeleteFileWithMetadata = mutation({
  args: S.Struct({
    fileId: SDocId("files"),
  }),
  handler: E.fn(function* (args) {
    const {db, storage} = yield* MutationCtx
    const file = yield* db.get(args.fileId)
    if (file) {
      yield* storage.delete(file.storageId)
      yield* db.delete(args.fileId)
    }
  }),
})

export const storageStore = action({
  args: S.Struct({
    content: S.String,
  }),
  handler: E.fn(function* (args) {
    const {storage} = yield* ActionCtx
    const blob = new Blob([args.content], {type: "text/plain"})
    return yield* storage.store(blob)
  }),
})

export const storageGetUrlAuthRequired = query({
  args: S.Struct({
    storageId: SDocId("_storage"),
  }),
  handler: E.fn(function* (args) {
    const {auth, storage} = yield* QueryCtx
    const identity = yield* auth.getUserIdentity()
    if (!identity) {
      return yield* new NotAuthenticatedError()
    }
    return yield* storage.getUrl(args.storageId)
  }),
})

export const storageGenerateUploadUrlAuthRequired = mutation({
  args: S.Struct({}),
  handler: E.fn(function* () {
    const {auth, storage} = yield* MutationCtx
    const identity = yield* auth.getUserIdentity()
    if (!identity) {
      return yield* new NotAuthenticatedError()
    }
    return yield* storage.generateUploadUrl()
  }),
})
