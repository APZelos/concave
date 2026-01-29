/* eslint-disable @typescript-eslint/no-empty-object-type */
import type {GenericId} from "convex/values"
import type {Doc} from "../../convex/_generated/dataModel"

import {
  expectTypeOfRegisteredActionArgs,
  expectTypeOfRegisteredActionReturns,
  expectTypeOfRegisteredMutationArgs,
  expectTypeOfRegisteredMutationReturns,
  expectTypeOfRegisteredQueryArgs,
  expectTypeOfRegisteredQueryReturns,
} from "@apzelos/concave-internal/assert"
import {describe, expect, it, test} from "vitest"

import {api} from "../../convex/_generated/api"
import * as storage from "../../convex/functions/storage"
import {setup} from "../../setup"

describe("Storage", () => {
  describe("generateUploadUrl", () => {
    it("should generate valid upload URL", async () => {
      const t = setup()

      const url = await t.mutation(api.functions.storage.storageGenerateUploadUrl, {})

      expect(url).toBeDefined()
      expect(typeof url).toBe("string")
      expect(url.length).toBeGreaterThan(0)
    })

    test("storageGenerateUploadUrl types", () => {
      expectTypeOfRegisteredMutationArgs(storage.storageGenerateUploadUrl).toEqualTypeOf<{}>()
      expectTypeOfRegisteredMutationReturns(storage.storageGenerateUploadUrl).toEqualTypeOf<
        Promise<string>
      >()
    })
  })

  describe("getUrl", () => {
    it("should return URL for existing file", async () => {
      const t = setup()

      const storageId = await t.run(async (ctx) => {
        return await ctx.storage.store(new Blob(["test content"], {type: "text/plain"}))
      })

      const url = await t.query(api.functions.storage.storageGetUrl, {storageId})

      expect(url).toBeDefined()
      expect(typeof url).toBe("string")
    })

    test("storageGetUrl types", () => {
      expectTypeOfRegisteredQueryArgs(storage.storageGetUrl).toEqualTypeOf<{
        storageId: GenericId<"_storage">
      }>()
      expectTypeOfRegisteredQueryReturns(storage.storageGetUrl).toEqualTypeOf<
        Promise<string | null>
      >()
    })
  })

  describe("delete", () => {
    it("should delete existing file", async () => {
      const t = setup()

      const storageId = await t.run(async (ctx) => {
        return await ctx.storage.store(new Blob(["to delete"], {type: "text/plain"}))
      })

      const urlBefore = await t.query(api.functions.storage.storageGetUrl, {storageId})
      expect(urlBefore).toBeDefined()

      await t.mutation(api.functions.storage.storageDelete, {storageId})

      const urlAfter = await t.query(api.functions.storage.storageGetUrl, {storageId})
      expect(urlAfter).toBeNull()
    })

    test("storageDelete types", () => {
      expectTypeOfRegisteredMutationArgs(storage.storageDelete).toEqualTypeOf<{
        storageId: GenericId<"_storage">
      }>()
      expectTypeOfRegisteredMutationReturns(storage.storageDelete).toEqualTypeOf<Promise<void>>()
    })
  })

  describe("store (action)", () => {
    it("should store blob and return ID", async () => {
      const t = setup()

      const storageId = await t.action(api.functions.storage.storageStore, {
        content: "action stored content",
      })

      expect(storageId).toBeDefined()
      expect(typeof storageId).toBe("string")

      const url = await t.query(api.functions.storage.storageGetUrl, {storageId})
      expect(url).toBeDefined()
    })

    test("storageStore types", () => {
      expectTypeOfRegisteredActionArgs(storage.storageStore).toEqualTypeOf<{
        content: string
      }>()
      expectTypeOfRegisteredActionReturns(storage.storageStore).toEqualTypeOf<
        Promise<GenericId<"_storage">>
      >()
    })
  })

  describe("File Metadata", () => {
    it("should create and retrieve metadata", async () => {
      const t = setup()

      const storageId = await t.run(async (ctx) => {
        return await ctx.storage.store(new Blob(["test content"], {type: "text/plain"}))
      })

      const fileId = await t.mutation(api.functions.storage.storageCreateFileRecord, {
        storageId,
        filename: "test.txt",
        size: 12,
      })

      const file = await t.query(api.functions.storage.storageGetFileRecord, {id: fileId})

      expect(file).toBeDefined()
      expect(file?.filename).toBe("test.txt")
      expect(file?.size).toBe(12)
    })

    test("storageCreateFileRecord types", () => {
      expectTypeOfRegisteredMutationArgs(storage.storageCreateFileRecord).toEqualTypeOf<{
        storageId: GenericId<"_storage">
        filename: string
        size: number
      }>()
      expectTypeOfRegisteredMutationReturns(storage.storageCreateFileRecord).toEqualTypeOf<
        Promise<GenericId<"files">>
      >()
    })

    test("storageGetFileRecord types", () => {
      expectTypeOfRegisteredQueryArgs(storage.storageGetFileRecord).toEqualTypeOf<{
        id: GenericId<"files">
      }>()
      expectTypeOfRegisteredQueryReturns(storage.storageGetFileRecord).toEqualTypeOf<
        Promise<Doc<"files"> | null>
      >()
    })

    it("should list files", async () => {
      const t = setup()

      const storageId1 = await t.run(async (ctx) => {
        return await ctx.storage.store(new Blob(["file 1"], {type: "text/plain"}))
      })
      const storageId2 = await t.run(async (ctx) => {
        return await ctx.storage.store(new Blob(["file 2"], {type: "text/plain"}))
      })

      await t.mutation(api.functions.storage.storageCreateFileRecord, {
        storageId: storageId1,
        filename: "file1.txt",
        size: 6,
      })

      await t.mutation(api.functions.storage.storageCreateFileRecord, {
        storageId: storageId2,
        filename: "file2.txt",
        size: 6,
      })

      const files = await t.query(api.functions.storage.storageListFiles, {})

      expect(files).toHaveLength(2)
    })

    test("storageListFiles types", () => {
      expectTypeOfRegisteredQueryArgs(storage.storageListFiles).toEqualTypeOf<{}>()
      expectTypeOfRegisteredQueryReturns(storage.storageListFiles).toEqualTypeOf<
        Promise<Doc<"files">[]>
      >()
    })
  })

  describe("Authentication", () => {
    describe("functions not requiring auth", () => {
      it("should succeed when unauthenticated", async () => {
        const t = setup()

        const url = await t.mutation(api.functions.storage.storageGenerateUploadUrl, {})

        expect(url).toBeDefined()
      })

      it("should succeed when authenticated", async () => {
        const t = setup()
        const authedT = t.withIdentity({
          name: "Test User",
          email: "test@example.com",
          tokenIdentifier: "test-token",
        })

        const url = await authedT.mutation(api.functions.storage.storageGenerateUploadUrl, {})

        expect(url).toBeDefined()
      })
    })

    describe("functions requiring auth", () => {
      it("should fail when unauthenticated", async () => {
        const t = setup()

        const storageId = await t.run(async (ctx) => {
          return await ctx.storage.store(new Blob(["test"], {type: "text/plain"}))
        })

        await expect(
          t.query(api.functions.storage.storageGetUrlAuthRequired, {storageId}),
        ).rejects.toThrow()
      })

      it("should succeed when authenticated", async () => {
        const t = setup()
        const authedT = t.withIdentity({
          name: "Auth User",
          email: "auth@example.com",
          tokenIdentifier: "auth-token-storage",
        })

        const storageId = await t.run(async (ctx) => {
          return await ctx.storage.store(new Blob(["test"], {type: "text/plain"}))
        })

        const url = await authedT.query(api.functions.storage.storageGetUrlAuthRequired, {
          storageId,
        })

        expect(url).toBeDefined()
      })

      test("storageGetUrlAuthRequired types", () => {
        expectTypeOfRegisteredQueryArgs(storage.storageGetUrlAuthRequired).toEqualTypeOf<{
          storageId: GenericId<"_storage">
        }>()
        expectTypeOfRegisteredQueryReturns(storage.storageGetUrlAuthRequired).toEqualTypeOf<
          Promise<string>
        >()
      })

      test("storageGenerateUploadUrlAuthRequired types", () => {
        expectTypeOfRegisteredMutationArgs(
          storage.storageGenerateUploadUrlAuthRequired,
        ).toEqualTypeOf<{}>()
        expectTypeOfRegisteredMutationReturns(
          storage.storageGenerateUploadUrlAuthRequired,
        ).toEqualTypeOf<Promise<string>>()
      })
    })
  })

  describe("File Record Operations", () => {
    test("storageDeleteFileRecord types", () => {
      expectTypeOfRegisteredMutationArgs(storage.storageDeleteFileRecord).toEqualTypeOf<{
        id: GenericId<"files">
      }>()
      expectTypeOfRegisteredMutationReturns(storage.storageDeleteFileRecord).toEqualTypeOf<
        Promise<void>
      >()
    })

    test("storageDeleteFileWithMetadata types", () => {
      expectTypeOfRegisteredMutationArgs(storage.storageDeleteFileWithMetadata).toEqualTypeOf<{
        fileId: GenericId<"files">
      }>()
      expectTypeOfRegisteredMutationReturns(storage.storageDeleteFileWithMetadata).toEqualTypeOf<
        Promise<void>
      >()
    })
  })
})
