import {describe, expect, it} from "vitest"

import {api} from "../convex/_generated/api"
import {setup} from "../setup"

describe("Storage Operations", () => {
  describe("generateUploadUrl", () => {
    it("should generate a valid upload URL", async () => {
      const t = setup()

      const url = await t.mutation(api.functions.files.generateUploadUrl, {})

      expect(url).toBeDefined()
      expect(typeof url).toBe("string")
      expect(url.length).toBeGreaterThan(0)
    })
  })

  describe("File metadata operations", () => {
    it("should create and retrieve file metadata", async () => {
      const t = setup()

      // Create a user first
      const userId = await t.mutation(api.functions.users.createUser, {
        name: "Uploader",
        email: "uploader@example.com",
        role: "user",
      })

      // Create a storage entry directly for testing
      const storageId = await t.run(async (ctx) => {
        return await ctx.storage.store(new Blob(["test content"], {type: "text/plain"}))
      })

      // Create file metadata
      const fileId = await t.mutation(api.functions.files.createFileRecord, {
        storageId,
        uploadedBy: userId,
        filename: "test.txt",
        contentType: "text/plain",
        size: 12,
      })

      // Retrieve file metadata
      const file = await t.query(api.functions.files.getFileMetadata, {id: fileId})

      expect(file).toBeDefined()
      expect(file?.filename).toBe("test.txt")
      expect(file?.contentType).toBe("text/plain")
      expect(file?.size).toBe(12)
    })

    it("should list files by uploader", async () => {
      const t = setup()

      const userId = await t.mutation(api.functions.users.createUser, {
        name: "Multi Uploader",
        email: "multi@example.com",
        role: "user",
      })

      // Create multiple storage entries
      const storageId1 = await t.run(async (ctx) => {
        return await ctx.storage.store(new Blob(["file 1"], {type: "text/plain"}))
      })
      const storageId2 = await t.run(async (ctx) => {
        return await ctx.storage.store(new Blob(["file 2"], {type: "text/plain"}))
      })

      await t.mutation(api.functions.files.createFileRecord, {
        storageId: storageId1,
        uploadedBy: userId,
        filename: "file1.txt",
        contentType: "text/plain",
        size: 6,
      })

      await t.mutation(api.functions.files.createFileRecord, {
        storageId: storageId2,
        uploadedBy: userId,
        filename: "file2.txt",
        contentType: "text/plain",
        size: 6,
      })

      const files = await t.query(api.functions.files.listFilesByUploader, {
        uploaderId: userId,
      })

      expect(files).toHaveLength(2)
    })
  })

  describe("getUrl", () => {
    it("should return URL for existing file", async () => {
      const t = setup()

      // Create a storage entry directly
      const storageId = await t.run(async (ctx) => {
        return await ctx.storage.store(new Blob(["test content"], {type: "text/plain"}))
      })

      const url = await t.query(api.functions.files.getFileUrl, {storageId})

      expect(url).toBeDefined()
      expect(typeof url).toBe("string")
    })
  })

  describe("delete", () => {
    it("should delete file and metadata", async () => {
      const t = setup()

      const userId = await t.mutation(api.functions.users.createUser, {
        name: "Delete Tester",
        email: "delete@example.com",
        role: "user",
      })

      const storageId = await t.run(async (ctx) => {
        return await ctx.storage.store(new Blob(["to delete"], {type: "text/plain"}))
      })

      const fileId = await t.mutation(api.functions.files.createFileRecord, {
        storageId,
        uploadedBy: userId,
        filename: "deleteme.txt",
        contentType: "text/plain",
        size: 9,
      })

      // Verify file exists
      const fileBefore = await t.query(api.functions.files.getFileMetadata, {id: fileId})
      expect(fileBefore).toBeDefined()

      // Delete file
      await t.mutation(api.functions.files.deleteFile, {id: fileId})

      // Verify metadata is gone
      const fileAfter = await t.query(api.functions.files.getFileMetadata, {id: fileId})
      expect(fileAfter).toBeNull()
    })

    it("should handle deleting non-existent file gracefully", async () => {
      const t = setup()

      const userId = await t.mutation(api.functions.users.createUser, {
        name: "Delete Tester",
        email: "delete2@example.com",
        role: "user",
      })

      const storageId = await t.run(async (ctx) => {
        return await ctx.storage.store(new Blob(["temp"], {type: "text/plain"}))
      })

      const fileId = await t.mutation(api.functions.files.createFileRecord, {
        storageId,
        uploadedBy: userId,
        filename: "temp.txt",
        contentType: "text/plain",
        size: 4,
      })

      // Delete twice - second should not throw
      await t.mutation(api.functions.files.deleteFile, {id: fileId})
      await t.mutation(api.functions.files.deleteFile, {id: fileId})
    })
  })
})
