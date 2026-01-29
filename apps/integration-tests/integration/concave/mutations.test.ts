/* eslint-disable @typescript-eslint/no-empty-object-type */
import type {Doc, Id} from "../../convex/_generated/dataModel"

import {
  expectTypeOfRegisteredMutationArgs,
  expectTypeOfRegisteredMutationReturns,
} from "@apzelos/concave-internal/assert"
import {describe, expect, it, test} from "vitest"

import {api, internal} from "../../convex/_generated/api"
import * as mutations from "../../convex/functions/mutations"
import {setup} from "../../setup"

async function createTestItem(
  t: ReturnType<typeof setup>,
  overrides: {
    name?: string
    category?: string
    status?: "active" | "inactive"
    priority?: number
    content?: string
  } = {},
) {
  return await t.mutation(api.functions.mutations.mutationInsert, {
    name: overrides.name ?? "Test Item",
    category: overrides.category ?? "default",
    status: overrides.status ?? "active",
    priority: overrides.priority ?? 1,
    content: overrides.content,
  })
}

describe("Mutations", () => {
  describe("Function Signatures", () => {
    describe("without args", () => {
      it("should execute without args schema", async () => {
        const t = setup()

        const result = await t.mutation(api.functions.mutations.mutationNoArgs, {})

        expect(result).toBe("mutation no args result")
      })

      it("should return value without returns schema", async () => {
        const t = setup()

        const result = await t.mutation(api.functions.mutations.mutationNoArgs, {})

        expect(typeof result).toBe("string")
      })

      it("should validate return value with returns schema", async () => {
        const t = setup()

        const result = await t.mutation(api.functions.mutations.mutationNoArgsWithReturns, {})

        expect(result).toBe("validated mutation return")
        expect(typeof result).toBe("string")
      })

      test("mutationNoArgs types", () => {
        expectTypeOfRegisteredMutationArgs(mutations.mutationNoArgs).toEqualTypeOf<{}>()
        expectTypeOfRegisteredMutationReturns(mutations.mutationNoArgs).toEqualTypeOf<
          Promise<string>
        >()
      })

      test("mutationNoArgsWithReturns types", () => {
        expectTypeOfRegisteredMutationArgs(mutations.mutationNoArgsWithReturns).toEqualTypeOf<{}>()
        expectTypeOfRegisteredMutationReturns(mutations.mutationNoArgsWithReturns).toEqualTypeOf<
          Promise<string>
        >()
      })
    })

    describe("with args", () => {
      it("should accept args matching schema", async () => {
        const t = setup()

        const result = await t.mutation(api.functions.mutations.mutationWithArgs, {
          name: "test",
          count: 42,
        })

        expect(result).toBe("mutation: test: 42")
      })

      it("should reject args not matching schema", async () => {
        const t = setup()

        await expect(
          // @ts-expect-error - intentionally passing invalid args
          t.mutation(api.functions.mutations.mutationWithArgs, {name: "test"}),
        ).rejects.toThrow()
      })

      it("should return value with returns schema", async () => {
        const t = setup()

        const result = await t.mutation(api.functions.mutations.mutationWithArgsWithReturns, {
          value: 10,
        })

        expect(result).toEqual({tripled: 30, original: 10})
      })

      test("mutationWithArgs types", () => {
        expectTypeOfRegisteredMutationArgs(mutations.mutationWithArgs).toEqualTypeOf<{
          name: string
          count: number
        }>()
        expectTypeOfRegisteredMutationReturns(mutations.mutationWithArgs).toEqualTypeOf<
          Promise<string>
        >()
      })

      test("mutationWithArgsWithReturns types", () => {
        expectTypeOfRegisteredMutationArgs(mutations.mutationWithArgsWithReturns).toEqualTypeOf<{
          value: number
        }>()
        expectTypeOfRegisteredMutationReturns(mutations.mutationWithArgsWithReturns).toEqualTypeOf<
          Promise<{tripled: number; original: number}>
        >()
      })
    })
  })

  describe("Authentication", () => {
    describe("public mutations", () => {
      it("should succeed when unauthenticated", async () => {
        const t = setup()

        const result = await t.mutation(api.functions.mutations.mutationNoAuthRequired, {})

        expect(result).toBe("public mutation")
      })

      it("should succeed when authenticated", async () => {
        const t = setup()
        const authedT = t.withIdentity({
          name: "Test User",
          email: "test@example.com",
          tokenIdentifier: "test-token",
        })

        const result = await authedT.mutation(api.functions.mutations.mutationNoAuthRequired, {})

        expect(result).toBe("public mutation")
      })

      test("mutationNoAuthRequired types", () => {
        expectTypeOfRegisteredMutationArgs(mutations.mutationNoAuthRequired).toEqualTypeOf<{}>()
        expectTypeOfRegisteredMutationReturns(mutations.mutationNoAuthRequired).toEqualTypeOf<
          Promise<string>
        >()
      })
    })

    describe("auth-required mutations", () => {
      it("should fail when unauthenticated", async () => {
        const t = setup()

        await expect(t.mutation(api.functions.mutations.mutationAuthRequired, {})).rejects.toThrow()
      })

      it("should succeed when authenticated", async () => {
        const t = setup()
        const authedT = t.withIdentity({
          name: "Test User",
          email: "test@example.com",
          tokenIdentifier: "test-token",
        })

        const result = await authedT.mutation(api.functions.mutations.mutationAuthRequired, {})

        expect(result).toEqual({
          tokenIdentifier: "test-token",
          name: "Test User",
        })
      })

      it("should provide identity to handler", async () => {
        const t = setup()
        const authedT = t.withIdentity({
          name: "Auth User",
          email: "auth@example.com",
          tokenIdentifier: "auth-token-456",
        })

        const identity = await authedT.mutation(api.functions.mutations.mutationGetIdentity, {})

        expect(identity).toBeDefined()
        expect(identity?.tokenIdentifier).toBe("auth-token-456")
        expect(identity?.name).toBe("Auth User")
      })

      test("mutationAuthRequired types", () => {
        expectTypeOfRegisteredMutationArgs(mutations.mutationAuthRequired).toEqualTypeOf<{}>()
        expectTypeOfRegisteredMutationReturns(mutations.mutationAuthRequired).toEqualTypeOf<
          Promise<{tokenIdentifier: string; name: string | undefined}>
        >()
      })

      test("mutationGetIdentity types", () => {
        expectTypeOfRegisteredMutationArgs(mutations.mutationGetIdentity).toEqualTypeOf<{}>()
        // Use toMatchTypeOf since UserIdentity has many optional fields
        expectTypeOfRegisteredMutationReturns(mutations.mutationGetIdentity).toMatchTypeOf<
          Promise<{tokenIdentifier: string} | null>
        >()
      })
    })
  })

  describe("Error Handling", () => {
    it("should propagate TaggedError from handler", async () => {
      const t = setup()

      await expect(
        t.mutation(api.functions.mutations.mutationThrowsTaggedError, {message: "test error"}),
      ).rejects.toThrow()
    })

    it("should propagate regular Error from handler", async () => {
      const t = setup()

      await expect(
        t.mutation(api.functions.mutations.mutationThrowsRegularError, {message: "regular error"}),
      ).rejects.toThrow("regular error")
    })

    test("mutationThrowsTaggedError types", () => {
      expectTypeOfRegisteredMutationArgs(mutations.mutationThrowsTaggedError).toEqualTypeOf<{
        message: string
      }>()
    })

    test("mutationThrowsRegularError types", () => {
      expectTypeOfRegisteredMutationArgs(mutations.mutationThrowsRegularError).toEqualTypeOf<{
        message: string
      }>()
    })
  })

  describe("Cross-Function Calls", () => {
    it("should call query via runQuery", async () => {
      const t = setup()

      const result = await t.mutation(api.functions.mutations.mutationCallsQuery, {value: 5})

      expect(result).toBe("mutation called query: internal: 10")
    })

    it("should call mutation via runMutation", async () => {
      const t = setup()

      const id = await t.mutation(api.functions.mutations.mutationCallsMutation, {
        name: "Created via runMutation",
      })

      expect(id).toBeDefined()
      expect(typeof id).toBe("string")

      // Verify the item was created
      const item = await t.mutation(api.functions.mutations.mutationGet, {id})
      expect(item?.name).toBe("Created via runMutation")
    })

    test("mutationCallsQuery types", () => {
      expectTypeOfRegisteredMutationArgs(mutations.mutationCallsQuery).toEqualTypeOf<{
        value: number
      }>()
      expectTypeOfRegisteredMutationReturns(mutations.mutationCallsQuery).toEqualTypeOf<
        Promise<string>
      >()
    })

    test("mutationCallsMutation types", () => {
      expectTypeOfRegisteredMutationArgs(mutations.mutationCallsMutation).toEqualTypeOf<{
        name: string
      }>()
      expectTypeOfRegisteredMutationReturns(mutations.mutationCallsMutation).toEqualTypeOf<
        Promise<Id<"items">>
      >()
    })
  })

  describe("Database Operations", () => {
    describe("insert", () => {
      it("should insert and return ID", async () => {
        const t = setup()

        const id = await createTestItem(t, {name: "New Item"})

        expect(id).toBeDefined()
        expect(typeof id).toBe("string")
      })

      it("should insert with optional fields", async () => {
        const t = setup()

        const id = await t.mutation(api.functions.mutations.mutationInsert, {
          name: "Item without content",
          category: "test",
          status: "active",
          priority: 1,
        })

        const item = await t.mutation(api.functions.mutations.mutationGet, {id})
        expect(item).toBeDefined()
        expect(item?.content).toBeUndefined()
      })

      test("mutationInsert types", () => {
        expectTypeOfRegisteredMutationArgs(mutations.mutationInsert).toEqualTypeOf<{
          name: string
          category: string
          status: "active" | "inactive"
          priority: number
          content?: string | undefined
        }>()
        expectTypeOfRegisteredMutationReturns(mutations.mutationInsert).toEqualTypeOf<
          Promise<Id<"items">>
        >()
      })
    })

    describe("get", () => {
      it("should return document by ID", async () => {
        const t = setup()

        const id = await createTestItem(t, {name: "Get Test"})

        const item = await t.mutation(api.functions.mutations.mutationGet, {id})

        expect(item).toBeDefined()
        expect(item?.name).toBe("Get Test")
      })

      it("should return null for non-existent ID", async () => {
        const t = setup()

        const id = await createTestItem(t, {name: "Temp"})
        await t.mutation(api.functions.mutations.mutationDelete, {id})

        const item = await t.mutation(api.functions.mutations.mutationGet, {id})

        expect(item).toBeNull()
      })

      test("mutationGet types", () => {
        expectTypeOfRegisteredMutationArgs(mutations.mutationGet).toEqualTypeOf<{
          id: Id<"items">
        }>()
        expectTypeOfRegisteredMutationReturns(mutations.mutationGet).toEqualTypeOf<
          Promise<Doc<"items"> | null>
        >()
      })
    })

    describe("patch", () => {
      it("should update single field", async () => {
        const t = setup()

        const id = await createTestItem(t, {name: "Original Name", category: "original"})

        await t.mutation(api.functions.mutations.mutationPatch, {
          id,
          name: "Updated Name",
        })

        const item = await t.mutation(api.functions.mutations.mutationGet, {id})
        expect(item?.name).toBe("Updated Name")
        expect(item?.category).toBe("original")
      })

      it("should update multiple fields", async () => {
        const t = setup()

        const id = await createTestItem(t, {name: "Original", category: "cat1", priority: 1})

        await t.mutation(api.functions.mutations.mutationPatch, {
          id,
          name: "Updated",
          priority: 10,
        })

        const item = await t.mutation(api.functions.mutations.mutationGet, {id})
        expect(item?.name).toBe("Updated")
        expect(item?.priority).toBe(10)
      })

      it("should preserve unmodified fields", async () => {
        const t = setup()

        const id = await createTestItem(t, {
          name: "Original",
          category: "preserved",
          status: "active",
          priority: 5,
        })

        await t.mutation(api.functions.mutations.mutationPatch, {
          id,
          name: "Changed",
        })

        const item = await t.mutation(api.functions.mutations.mutationGet, {id})
        expect(item?.name).toBe("Changed")
        expect(item?.category).toBe("preserved")
        expect(item?.status).toBe("active")
        expect(item?.priority).toBe(5)
      })

      test("mutationPatch types", () => {
        expectTypeOfRegisteredMutationArgs(mutations.mutationPatch).toEqualTypeOf<{
          id: Id<"items">
          name?: string | undefined
          category?: string | undefined
          status?: "active" | "inactive" | undefined
          priority?: number | undefined
          content?: string | undefined
        }>()
        expectTypeOfRegisteredMutationReturns(mutations.mutationPatch).toEqualTypeOf<
          Promise<void>
        >()
      })
    })

    describe("replace", () => {
      it("should replace entire document", async () => {
        const t = setup()

        const id = await createTestItem(t, {
          name: "Original",
          category: "old-category",
          status: "inactive",
          priority: 1,
        })

        const original = await t.mutation(api.functions.mutations.mutationGet, {id})

        await t.mutation(api.functions.mutations.mutationReplace, {
          id,
          name: "Replaced",
          category: "new-category",
          status: "active",
          priority: 99,
          createdAt: original!.createdAt,
        })

        const replaced = await t.mutation(api.functions.mutations.mutationGet, {id})
        expect(replaced?.name).toBe("Replaced")
        expect(replaced?.category).toBe("new-category")
        expect(replaced?.status).toBe("active")
        expect(replaced?.priority).toBe(99)
      })

      it("should preserve _id and _creationTime", async () => {
        const t = setup()

        const id = await createTestItem(t, {name: "Original"})
        const original = await t.mutation(api.functions.mutations.mutationGet, {id})

        await t.mutation(api.functions.mutations.mutationReplace, {
          id,
          name: "Replaced",
          category: "new",
          status: "active",
          priority: 1,
          createdAt: original!.createdAt,
        })

        const replaced = await t.mutation(api.functions.mutations.mutationGet, {id})
        expect(replaced?._id).toBe(original?._id)
        expect(replaced?._creationTime).toBe(original?._creationTime)
      })

      test("mutationReplace types", () => {
        expectTypeOfRegisteredMutationArgs(mutations.mutationReplace).toEqualTypeOf<{
          id: Id<"items">
          name: string
          category: string
          status: "active" | "inactive"
          priority: number
          content?: string | undefined
          createdAt: number
        }>()
        expectTypeOfRegisteredMutationReturns(mutations.mutationReplace).toEqualTypeOf<
          Promise<void>
        >()
      })
    })

    describe("delete", () => {
      it("should delete document", async () => {
        const t = setup()

        const id = await createTestItem(t, {name: "To Delete"})

        await t.mutation(api.functions.mutations.mutationDelete, {id})

        const item = await t.mutation(api.functions.mutations.mutationGet, {id})
        expect(item).toBeNull()
      })

      it("should throw when deleting non-existent ID", async () => {
        const t = setup()

        const id = await createTestItem(t, {name: "Temp"})
        await t.mutation(api.functions.mutations.mutationDelete, {id})

        // Deleting again should throw (Convex behavior)
        await expect(t.mutation(api.functions.mutations.mutationDelete, {id})).rejects.toThrow()
      })

      test("mutationDelete types", () => {
        expectTypeOfRegisteredMutationArgs(mutations.mutationDelete).toEqualTypeOf<{
          id: Id<"items">
        }>()
        expectTypeOfRegisteredMutationReturns(mutations.mutationDelete).toEqualTypeOf<
          Promise<void>
        >()
      })
    })

    describe("normalizeId", () => {
      it("should return valid ID unchanged", async () => {
        const t = setup()

        const id = await createTestItem(t, {name: "Test"})

        const normalized = await t.mutation(api.functions.mutations.mutationNormalizeId, {
          idString: id,
        })

        expect(normalized).toBe(id)
      })

      it("should return null for invalid ID", async () => {
        const t = setup()

        const normalized = await t.mutation(api.functions.mutations.mutationNormalizeId, {
          idString: "invalid-id-format",
        })

        expect(normalized).toBeNull()
      })

      test("mutationNormalizeId types", () => {
        expectTypeOfRegisteredMutationArgs(mutations.mutationNormalizeId).toEqualTypeOf<{
          idString: string
        }>()
        expectTypeOfRegisteredMutationReturns(mutations.mutationNormalizeId).toEqualTypeOf<
          Promise<Id<"items"> | null>
        >()
      })
    })
  })

  describe("Internal Mutations", () => {
    it("should be callable directly", async () => {
      const t = setup()

      const result = await t.mutation(internal.functions.mutations.internalMutationNoArgs, {})

      expect(result).toBe("internal mutation no args")
    })

    it("should work without args", async () => {
      const t = setup()

      const result = await t.mutation(internal.functions.mutations.internalMutationNoArgs, {})

      expect(typeof result).toBe("string")
    })

    it("should work with args", async () => {
      const t = setup()

      const result = await t.mutation(internal.functions.mutations.internalMutationWithArgs, {
        value: 7,
      })

      expect(result).toBe("internal mutation: 21")
    })

    test("internalMutationNoArgs types", () => {
      expectTypeOfRegisteredMutationArgs(mutations.internalMutationNoArgs).toEqualTypeOf<{}>()
      expectTypeOfRegisteredMutationReturns(mutations.internalMutationNoArgs).toEqualTypeOf<
        Promise<string>
      >()
    })

    test("internalMutationWithArgs types", () => {
      expectTypeOfRegisteredMutationArgs(mutations.internalMutationWithArgs).toEqualTypeOf<{
        value: number
      }>()
      expectTypeOfRegisteredMutationReturns(mutations.internalMutationWithArgs).toEqualTypeOf<
        Promise<string>
      >()
    })
  })

  describe("Schema Transformations", () => {
    describe("args transformations", () => {
      it("should decode NumberFromString in mutation args", async () => {
        const t = setup()

        const result = await t.mutation(api.functions.mutations.mutationWithNumberFromString, {
          value: "21",
        })

        expect(result).toBe("mutation received: 42")
      })

      it("should decode DateFromString and use in database operation", async () => {
        const t = setup()
        const isoDate = "2024-01-15T10:30:00.000Z"

        const id = await t.mutation(api.functions.mutations.mutationWithDateTransformation, {
          name: "Test Item",
          createdAtString: isoDate,
        })

        const item = await t.mutation(api.functions.mutations.mutationGet, {id})
        expect(item?.createdAt).toBe(new Date(isoDate).getTime())
      })

      test("mutationWithNumberFromString types", () => {
        expectTypeOfRegisteredMutationArgs(mutations.mutationWithNumberFromString).toEqualTypeOf<{
          value: string
        }>()
        expectTypeOfRegisteredMutationReturns(mutations.mutationWithNumberFromString).toEqualTypeOf<
          Promise<string>
        >()
      })

      test("mutationWithDateTransformation types", () => {
        expectTypeOfRegisteredMutationArgs(mutations.mutationWithDateTransformation).toEqualTypeOf<{
          name: string
          createdAtString: string
        }>()
        expectTypeOfRegisteredMutationReturns(
          mutations.mutationWithDateTransformation,
        ).toEqualTypeOf<Promise<Id<"items">>>()
      })
    })

    describe("returns transformations", () => {
      it("should decode NumberFromString - handler returns string, client receives number", async () => {
        const t = setup()

        const result = await t.mutation(api.functions.mutations.mutationReturnsNumber, {
          value: 21,
        })

        expect(typeof result).toBe("number")
        expect(result).toBe(42)
      })

      test("mutationReturnsNumber types", () => {
        expectTypeOfRegisteredMutationArgs(mutations.mutationReturnsNumber).toEqualTypeOf<{
          value: number
        }>()
        expectTypeOfRegisteredMutationReturns(mutations.mutationReturnsNumber).toEqualTypeOf<
          Promise<number>
        >()
      })
    })
  })
})
