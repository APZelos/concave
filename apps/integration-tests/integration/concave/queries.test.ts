/* eslint-disable @typescript-eslint/no-empty-object-type */
import type {PaginationResult} from "convex/server"
import type {GenericId} from "convex/values"
import type {Doc} from "../../convex/_generated/dataModel"

import {
  expectTypeOfRegisteredQueryArgs,
  expectTypeOfRegisteredQueryReturns,
} from "@apzelos/concave-internal/assert"
import {describe, expect, it, test} from "vitest"

import {api, internal} from "../../convex/_generated/api"
import * as queries from "../../convex/functions/queries"
import {setup} from "../../setup"

async function createItem(t: ReturnType<typeof setup>, name: string, category: string) {
  return await t.run(async (ctx) => {
    return await ctx.db.insert("items", {
      name,
      category,
      status: "active",
      priority: 1,
      value: 0,
      createdAt: Date.now(),
    })
  })
}

describe("Queries", () => {
  describe("Function Signatures", () => {
    describe("without args", () => {
      it("should execute without args schema", async () => {
        const t = setup()

        const result = await t.query(api.functions.queries.queryNoArgs, {})

        expect(result).toBe("no args result")
      })

      it("should return value without returns schema", async () => {
        const t = setup()

        const result = await t.query(api.functions.queries.queryNoArgs, {})

        expect(typeof result).toBe("string")
      })

      it("should validate return value with returns schema", async () => {
        const t = setup()

        const result = await t.query(api.functions.queries.queryNoArgsWithReturns, {})

        expect(result).toBe("validated return")
        expect(typeof result).toBe("string")
      })

      test("queryNoArgs types", () => {
        expectTypeOfRegisteredQueryArgs(queries.queryNoArgs).toEqualTypeOf<{}>()
        expectTypeOfRegisteredQueryReturns(queries.queryNoArgs).toEqualTypeOf<Promise<string>>()
      })

      test("queryNoArgsWithReturns types", () => {
        expectTypeOfRegisteredQueryArgs(queries.queryNoArgsWithReturns).toEqualTypeOf<{}>()
        expectTypeOfRegisteredQueryReturns(queries.queryNoArgsWithReturns).toEqualTypeOf<
          Promise<string>
        >()
      })
    })

    describe("with args", () => {
      it("should accept args matching schema", async () => {
        const t = setup()

        const result = await t.query(api.functions.queries.queryWithArgs, {
          name: "test",
          count: 42,
        })

        expect(result).toBe("test: 42")
      })

      it("should reject args not matching schema", async () => {
        const t = setup()

        await expect(
          // @ts-expect-error - intentionally passing invalid args
          t.query(api.functions.queries.queryWithArgs, {name: "test"}),
        ).rejects.toThrow()
      })

      it("should return value with returns schema", async () => {
        const t = setup()

        const result = await t.query(api.functions.queries.queryWithArgsWithReturns, {
          value: 10,
        })

        expect(result).toEqual({doubled: 20, original: 10})
      })

      test("queryWithArgs types", () => {
        expectTypeOfRegisteredQueryArgs(queries.queryWithArgs).toEqualTypeOf<{
          name: string
          count: number
        }>()
        expectTypeOfRegisteredQueryReturns(queries.queryWithArgs).toEqualTypeOf<Promise<string>>()
      })

      test("queryWithArgsWithReturns types", () => {
        expectTypeOfRegisteredQueryArgs(queries.queryWithArgsWithReturns).toEqualTypeOf<{
          value: number
        }>()
        expectTypeOfRegisteredQueryReturns(queries.queryWithArgsWithReturns).toEqualTypeOf<
          Promise<{doubled: number; original: number}>
        >()
      })
    })
  })

  describe("Authentication", () => {
    describe("public queries", () => {
      it("should succeed when unauthenticated", async () => {
        const t = setup()

        const result = await t.query(api.functions.queries.queryNoAuthRequired, {})

        expect(result).toBe("public query")
      })

      it("should succeed when authenticated", async () => {
        const t = setup()
        const authedT = t.withIdentity({
          name: "Test User",
          email: "test@example.com",
          tokenIdentifier: "test-token",
        })

        const result = await authedT.query(api.functions.queries.queryNoAuthRequired, {})

        expect(result).toBe("public query")
      })

      test("queryNoAuthRequired types", () => {
        expectTypeOfRegisteredQueryArgs(queries.queryNoAuthRequired).toEqualTypeOf<{}>()
        expectTypeOfRegisteredQueryReturns(queries.queryNoAuthRequired).toEqualTypeOf<
          Promise<string>
        >()
      })
    })

    describe("auth-required queries", () => {
      it("should fail when unauthenticated", async () => {
        const t = setup()

        await expect(t.query(api.functions.queries.queryAuthRequired, {})).rejects.toThrow()
      })

      it("should succeed when authenticated", async () => {
        const t = setup()
        const authedT = t.withIdentity({
          name: "Test User",
          email: "test@example.com",
          tokenIdentifier: "test-token",
        })

        const result = await authedT.query(api.functions.queries.queryAuthRequired, {})

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
          tokenIdentifier: "auth-token-123",
        })

        const identity = await authedT.query(api.functions.queries.queryGetIdentity, {})

        expect(identity).toBeDefined()
        expect(identity?.tokenIdentifier).toBe("auth-token-123")
        expect(identity?.name).toBe("Auth User")
      })

      test("queryAuthRequired types", () => {
        expectTypeOfRegisteredQueryArgs(queries.queryAuthRequired).toEqualTypeOf<{}>()
        expectTypeOfRegisteredQueryReturns(queries.queryAuthRequired).toEqualTypeOf<
          Promise<{tokenIdentifier: string; name: string | undefined}>
        >()
      })

      test("queryGetIdentity types", () => {
        expectTypeOfRegisteredQueryArgs(queries.queryGetIdentity).toEqualTypeOf<{}>()
        // Returns UserIdentity | null - use toMatchTypeOf since UserIdentity has many optional fields
        expectTypeOfRegisteredQueryReturns(queries.queryGetIdentity).toMatchTypeOf<
          Promise<{tokenIdentifier: string} | null>
        >()
      })
    })
  })

  describe("Error Handling", () => {
    it("should propagate TaggedError from handler", async () => {
      const t = setup()

      await expect(
        t.query(api.functions.queries.queryThrowsTaggedError, {message: "test error"}),
      ).rejects.toThrow()
    })

    it("should propagate regular Error from handler", async () => {
      const t = setup()

      await expect(
        t.query(api.functions.queries.queryThrowsRegularError, {message: "regular error"}),
      ).rejects.toThrow("regular error")
    })

    test("queryThrowsTaggedError types", () => {
      expectTypeOfRegisteredQueryArgs(queries.queryThrowsTaggedError).toEqualTypeOf<{
        message: string
      }>()
    })

    test("queryThrowsRegularError types", () => {
      expectTypeOfRegisteredQueryArgs(queries.queryThrowsRegularError).toEqualTypeOf<{
        message: string
      }>()
    })
  })

  describe("Cross-Function Calls", () => {
    it("should call other query via runQuery", async () => {
      const t = setup()

      const result = await t.query(api.functions.queries.queryCallsQuery, {value: 5})

      expect(result).toBe("called: internal: 10")
    })

    test("queryCallsQuery types", () => {
      expectTypeOfRegisteredQueryArgs(queries.queryCallsQuery).toEqualTypeOf<{value: number}>()
      expectTypeOfRegisteredQueryReturns(queries.queryCallsQuery).toEqualTypeOf<Promise<string>>()
    })
  })

  describe("Database Operations", () => {
    describe("fullTableScan", () => {
      it("should return all documents", async () => {
        const t = setup()

        await createItem(t, "Item 1", "default")
        await createItem(t, "Item 2", "default")
        await createItem(t, "Item 3", "default")

        const items = await t.query(api.functions.queries.queryFullTableScan, {})

        expect(items).toHaveLength(3)
      })

      it("should return empty array when table is empty", async () => {
        const t = setup()

        const items = await t.query(api.functions.queries.queryFullTableScan, {})

        expect(items).toEqual([])
      })

      test("queryFullTableScan types", () => {
        expectTypeOfRegisteredQueryArgs(queries.queryFullTableScan).toEqualTypeOf<{}>()
        expectTypeOfRegisteredQueryReturns(queries.queryFullTableScan).toEqualTypeOf<
          Promise<Doc<"items">[]>
        >()
      })
    })

    describe("order", () => {
      it("should sort ascending", async () => {
        const t = setup()

        await createItem(t, "First", "default")
        await createItem(t, "Second", "default")

        const items = await t.query(api.functions.queries.queryWithOrderAsc, {})

        expect(items.length).toBeGreaterThanOrEqual(2)
        expect(items[0]!._creationTime).toBeLessThanOrEqual(items[1]!._creationTime)
      })

      it("should sort descending", async () => {
        const t = setup()

        await createItem(t, "First", "default")
        await createItem(t, "Second", "default")

        const items = await t.query(api.functions.queries.queryWithOrderDesc, {})

        expect(items.length).toBeGreaterThanOrEqual(2)
        expect(items[0]!._creationTime).toBeGreaterThanOrEqual(items[1]!._creationTime)
      })

      test("queryWithOrderAsc types", () => {
        expectTypeOfRegisteredQueryArgs(queries.queryWithOrderAsc).toEqualTypeOf<{}>()
        expectTypeOfRegisteredQueryReturns(queries.queryWithOrderAsc).toEqualTypeOf<
          Promise<Doc<"items">[]>
        >()
      })

      test("queryWithOrderDesc types", () => {
        expectTypeOfRegisteredQueryArgs(queries.queryWithOrderDesc).toEqualTypeOf<{}>()
        expectTypeOfRegisteredQueryReturns(queries.queryWithOrderDesc).toEqualTypeOf<
          Promise<Doc<"items">[]>
        >()
      })
    })

    describe("take", () => {
      it("should limit results to N", async () => {
        const t = setup()

        await createItem(t, "Item 1", "default")
        await createItem(t, "Item 2", "default")
        await createItem(t, "Item 3", "default")

        const items = await t.query(api.functions.queries.queryWithTake, {count: 2})

        expect(items).toHaveLength(2)
      })

      it("should return all if N exceeds total", async () => {
        const t = setup()

        await createItem(t, "Only Item", "default")

        const items = await t.query(api.functions.queries.queryWithTake, {count: 10})

        expect(items).toHaveLength(1)
      })

      test("queryWithTake types", () => {
        expectTypeOfRegisteredQueryArgs(queries.queryWithTake).toEqualTypeOf<{count: number}>()
        expectTypeOfRegisteredQueryReturns(queries.queryWithTake).toEqualTypeOf<
          Promise<Doc<"items">[]>
        >()
      })
    })

    describe("first", () => {
      it("should return first document", async () => {
        const t = setup()

        await createItem(t, "First Item", "default")
        await createItem(t, "Second Item", "default")

        const item = await t.query(api.functions.queries.queryFirst, {})

        expect(item).toBeDefined()
        expect(item?.name).toBe("First Item")
      })

      it("should return null when empty", async () => {
        const t = setup()

        const item = await t.query(api.functions.queries.queryFirst, {})

        expect(item).toBeNull()
      })

      test("queryFirst types", () => {
        expectTypeOfRegisteredQueryArgs(queries.queryFirst).toEqualTypeOf<{}>()
        expectTypeOfRegisteredQueryReturns(queries.queryFirst).toEqualTypeOf<
          Promise<Doc<"items"> | null>
        >()
      })
    })

    describe("withIndex", () => {
      it("should filter by index field", async () => {
        const t = setup()

        await createItem(t, "Cat Item", "animals")
        await createItem(t, "Dog Item", "animals")
        await createItem(t, "Car Item", "vehicles")

        const animals = await t.query(api.functions.queries.queryWithIndex, {
          category: "animals",
        })

        expect(animals).toHaveLength(2)
        expect(animals.every((item: {category: string}) => item.category === "animals")).toBe(true)
      })

      it("should return empty when no match", async () => {
        const t = setup()

        await createItem(t, "Item", "other")

        const items = await t.query(api.functions.queries.queryWithIndex, {
          category: "nonexistent",
        })

        expect(items).toEqual([])
      })

      test("queryWithIndex types", () => {
        expectTypeOfRegisteredQueryArgs(queries.queryWithIndex).toEqualTypeOf<{category: string}>()
        expectTypeOfRegisteredQueryReturns(queries.queryWithIndex).toEqualTypeOf<
          Promise<Doc<"items">[]>
        >()
      })
    })

    describe("unique", () => {
      it("should return document when exactly one", async () => {
        const t = setup()

        await createItem(t, "Unique Item", "unique-cat")

        const item = await t.query(api.functions.queries.queryUnique, {
          category: "unique-cat",
        })

        expect(item).toBeDefined()
        expect(item?.category).toBe("unique-cat")
      })

      it("should return null when none", async () => {
        const t = setup()

        const item = await t.query(api.functions.queries.queryUnique, {
          category: "nonexistent",
        })

        expect(item).toBeNull()
      })

      it("should throw DocNotUniqueError when multiple", async () => {
        const t = setup()

        await createItem(t, "Item 1", "duplicate")
        await createItem(t, "Item 2", "duplicate")

        await expect(
          t.query(api.functions.queries.queryUnique, {category: "duplicate"}),
        ).rejects.toThrow()
      })

      test("queryUnique types", () => {
        expectTypeOfRegisteredQueryArgs(queries.queryUnique).toEqualTypeOf<{category: string}>()
        expectTypeOfRegisteredQueryReturns(queries.queryUnique).toEqualTypeOf<
          Promise<Doc<"items"> | null>
        >()
      })
    })

    describe("paginate", () => {
      it("should return first page with cursor", async () => {
        const t = setup()

        for (let i = 0; i < 5; i++) {
          await createItem(t, `Item ${i}`, "default")
        }

        const firstPage = await t.query(api.functions.queries.queryPaginate, {
          paginationOpts: {numItems: 2, cursor: null},
        })

        expect(firstPage.page).toHaveLength(2)
        expect(firstPage.isDone).toBe(false)
        expect(firstPage.continueCursor).toBeDefined()
      })

      it("should return subsequent pages", async () => {
        const t = setup()

        for (let i = 0; i < 5; i++) {
          await createItem(t, `Item ${i}`, "default")
        }

        const firstPage = await t.query(api.functions.queries.queryPaginate, {
          paginationOpts: {numItems: 2, cursor: null},
        })

        const secondPage = await t.query(api.functions.queries.queryPaginate, {
          paginationOpts: {numItems: 2, cursor: firstPage.continueCursor},
        })

        expect(secondPage.page).toHaveLength(2)
        const firstPageIds = firstPage.page.map((item: {_id: string}) => item._id)
        const secondPageIds = secondPage.page.map((item: {_id: string}) => item._id)
        expect(firstPageIds.some((id: string) => secondPageIds.includes(id))).toBe(false)
      })

      it("should indicate done on last page", async () => {
        const t = setup()

        await createItem(t, "Single Item", "default")

        const result = await t.query(api.functions.queries.queryPaginate, {
          paginationOpts: {numItems: 10, cursor: null},
        })

        expect(result.page).toHaveLength(1)
        expect(result.isDone).toBe(true)
      })

      test("queryPaginate types", () => {
        expectTypeOfRegisteredQueryArgs(queries.queryPaginate).toEqualTypeOf<{
          paginationOpts: {numItems: number; cursor: string | null}
        }>()
        expectTypeOfRegisteredQueryReturns(queries.queryPaginate).toEqualTypeOf<
          Promise<PaginationResult<Doc<"items">>>
        >()
      })
    })

    describe("compound indexes", () => {
      it("should filter by multiple index fields", async () => {
        const t = setup()

        await t.run(async (ctx) => {
          await ctx.db.insert("items", {
            name: "Tech Active",
            category: "tech",
            status: "active",
            priority: 1,
            value: 0,
            createdAt: Date.now(),
          })
          await ctx.db.insert("items", {
            name: "Tech Inactive",
            category: "tech",
            status: "inactive",
            priority: 1,
            value: 0,
            createdAt: Date.now(),
          })
          await ctx.db.insert("items", {
            name: "Food Active",
            category: "food",
            status: "active",
            priority: 1,
            value: 0,
            createdAt: Date.now(),
          })
        })

        const items = await t.query(api.functions.queries.queryCompoundIndex, {
          category: "tech",
          status: "active",
        })

        expect(items).toHaveLength(1)
        expect(items[0]!.category).toBe("tech")
        expect(items[0]!.status).toBe("active")
      })

      it("should support partial prefix match", async () => {
        const t = setup()

        await t.run(async (ctx) => {
          await ctx.db.insert("items", {
            name: "Tech Active",
            category: "tech",
            status: "active",
            priority: 1,
            value: 0,
            createdAt: Date.now(),
          })
          await ctx.db.insert("items", {
            name: "Tech Inactive",
            category: "tech",
            status: "inactive",
            priority: 1,
            value: 0,
            createdAt: Date.now(),
          })
          await ctx.db.insert("items", {
            name: "Food Active",
            category: "food",
            status: "active",
            priority: 1,
            value: 0,
            createdAt: Date.now(),
          })
        })

        const items = await t.query(api.functions.queries.queryCompoundIndexPartial, {
          category: "tech",
        })

        expect(items).toHaveLength(2)
        expect(items.every((item: {category: string}) => item.category === "tech")).toBe(true)
      })

      test("queryCompoundIndex types", () => {
        expectTypeOfRegisteredQueryArgs(queries.queryCompoundIndex).toEqualTypeOf<{
          category: string
          status: "active" | "inactive"
        }>()
        expectTypeOfRegisteredQueryReturns(queries.queryCompoundIndex).toEqualTypeOf<
          Promise<Doc<"items">[]>
        >()
      })

      test("queryCompoundIndexPartial types", () => {
        expectTypeOfRegisteredQueryArgs(queries.queryCompoundIndexPartial).toEqualTypeOf<{
          category: string
        }>()
        expectTypeOfRegisteredQueryReturns(queries.queryCompoundIndexPartial).toEqualTypeOf<
          Promise<Doc<"items">[]>
        >()
      })
    })

    describe("search", () => {
      it("should find documents by text", async () => {
        const t = setup()

        await t.run(async (ctx) => {
          await ctx.db.insert("items", {
            name: "Cat Article",
            category: "articles",
            status: "active",
            priority: 1,
            value: 0,
            content: "Cats are wonderful pets",
            createdAt: Date.now(),
          })
          await ctx.db.insert("items", {
            name: "Dog Article",
            category: "articles",
            status: "active",
            priority: 1,
            value: 0,
            content: "Dogs are loyal companions",
            createdAt: Date.now(),
          })
        })

        const results = await t.query(api.functions.queries.querySearch, {
          searchText: "cats wonderful",
        })

        expect(Array.isArray(results)).toBe(true)
      })

      it("should return empty when no match", async () => {
        const t = setup()

        await t.run(async (ctx) => {
          await ctx.db.insert("items", {
            name: "Item",
            category: "misc",
            status: "active",
            priority: 1,
            value: 0,
            content: "Some content",
            createdAt: Date.now(),
          })
        })

        const results = await t.query(api.functions.queries.querySearch, {
          searchText: "elephants",
        })

        expect(results).toEqual([])
      })

      test("querySearch types", () => {
        expectTypeOfRegisteredQueryArgs(queries.querySearch).toEqualTypeOf<{searchText: string}>()
        expectTypeOfRegisteredQueryReturns(queries.querySearch).toEqualTypeOf<
          Promise<Doc<"items">[]>
        >()
      })

      test("querySearchWithFilter types", () => {
        expectTypeOfRegisteredQueryArgs(queries.querySearchWithFilter).toEqualTypeOf<{
          searchText: string
          category: string
        }>()
        expectTypeOfRegisteredQueryReturns(queries.querySearchWithFilter).toEqualTypeOf<
          Promise<Doc<"items">[]>
        >()
      })
    })

    describe("filter", () => {
      it("should apply filter to results", async () => {
        const t = setup()

        await t.run(async (ctx) => {
          await ctx.db.insert("items", {
            name: "Low Priority",
            category: "tasks",
            status: "active",
            priority: 1,
            value: 0,
            createdAt: Date.now(),
          })
          await ctx.db.insert("items", {
            name: "High Priority",
            category: "tasks",
            status: "active",
            priority: 10,
            value: 0,
            createdAt: Date.now(),
          })
          await ctx.db.insert("items", {
            name: "Medium Priority",
            category: "tasks",
            status: "active",
            priority: 5,
            value: 0,
            createdAt: Date.now(),
          })
        })

        const highPriorityItems = await t.query(api.functions.queries.queryWithFilter, {
          minPriority: 5,
        })

        expect(highPriorityItems).toHaveLength(2)
        expect(highPriorityItems.every((item: {priority: number}) => item.priority >= 5)).toBe(true)
      })

      test("queryWithFilter types", () => {
        expectTypeOfRegisteredQueryArgs(queries.queryWithFilter).toEqualTypeOf<{
          minPriority: number
        }>()
        expectTypeOfRegisteredQueryReturns(queries.queryWithFilter).toEqualTypeOf<
          Promise<Doc<"items">[]>
        >()
      })
    })

    describe("get", () => {
      it("should return document by ID", async () => {
        const t = setup()

        const id = await createItem(t, "Get Test", "default")

        const item = await t.query(api.functions.queries.queryGet, {id})

        expect(item).toBeDefined()
        expect(item?.name).toBe("Get Test")
      })

      it("should return null for non-existent ID", async () => {
        const t = setup()

        // Create and delete to get a valid but non-existent ID format
        const id = await createItem(t, "Temp", "default")
        await t.run(async (ctx) => {
          await ctx.db.delete(id)
        })

        const item = await t.query(api.functions.queries.queryGet, {id})

        expect(item).toBeNull()
      })

      test("queryGet types", () => {
        expectTypeOfRegisteredQueryArgs(queries.queryGet).toEqualTypeOf<{
          id: GenericId<"items">
        }>()
        expectTypeOfRegisteredQueryReturns(queries.queryGet).toEqualTypeOf<
          Promise<Doc<"items"> | null>
        >()
      })
    })

    describe("normalizeId", () => {
      it("should return valid ID unchanged", async () => {
        const t = setup()

        const id = await createItem(t, "Test", "default")

        const normalized = await t.query(api.functions.queries.queryNormalizeId, {
          idString: id,
        })

        expect(normalized).toBe(id)
      })

      it("should return null for invalid ID", async () => {
        const t = setup()

        const normalized = await t.query(api.functions.queries.queryNormalizeId, {
          idString: "invalid-id",
        })

        expect(normalized).toBeNull()
      })

      test("queryNormalizeId types", () => {
        expectTypeOfRegisteredQueryArgs(queries.queryNormalizeId).toEqualTypeOf<{
          idString: string
        }>()
        expectTypeOfRegisteredQueryReturns(queries.queryNormalizeId).toEqualTypeOf<
          Promise<GenericId<"items"> | null>
        >()
      })
    })
  })

  describe("Internal Queries", () => {
    it("should be callable directly", async () => {
      const t = setup()

      const result = await t.query(internal.functions.queries.internalQueryNoArgs, {})

      expect(result).toBe("internal no args")
    })

    it("should work without args", async () => {
      const t = setup()

      const result = await t.query(internal.functions.queries.internalQueryNoArgs, {})

      expect(typeof result).toBe("string")
    })

    it("should work with args", async () => {
      const t = setup()

      const result = await t.query(internal.functions.queries.internalQueryWithArgs, {
        value: 7,
      })

      expect(result).toBe("internal: 14")
    })

    test("internalQueryNoArgs types", () => {
      expectTypeOfRegisteredQueryArgs(queries.internalQueryNoArgs).toEqualTypeOf<{}>()
      expectTypeOfRegisteredQueryReturns(queries.internalQueryNoArgs).toEqualTypeOf<
        Promise<string>
      >()
    })

    test("internalQueryWithArgs types", () => {
      expectTypeOfRegisteredQueryArgs(queries.internalQueryWithArgs).toEqualTypeOf<{
        value: number
      }>()
      expectTypeOfRegisteredQueryReturns(queries.internalQueryWithArgs).toEqualTypeOf<
        Promise<string>
      >()
    })
  })

  describe("Schema Transformations", () => {
    describe("args transformations", () => {
      it("should decode NumberFromString - string to number", async () => {
        const t = setup()

        const result = await t.query(api.functions.queries.queryWithNumberFromString, {
          value: "42",
        })

        expect(result).toBe(84)
      })

      it("should reject invalid NumberFromString input", async () => {
        const t = setup()

        await expect(
          t.query(api.functions.queries.queryWithNumberFromString, {
            value: "not-a-number",
          }),
        ).rejects.toThrow()
      })

      test("queryWithNumberFromString types", () => {
        expectTypeOfRegisteredQueryArgs(queries.queryWithNumberFromString).toEqualTypeOf<{
          value: string
        }>()
        expectTypeOfRegisteredQueryReturns(queries.queryWithNumberFromString).toEqualTypeOf<
          Promise<number>
        >()
      })

      it("should decode DateFromString - ISO string to Date", async () => {
        const t = setup()
        const isoDate = "2024-01-15T10:30:00.000Z"

        const result = await t.query(api.functions.queries.queryWithDateFromString, {
          date: isoDate,
        })

        expect(result).toBe(new Date(isoDate).getTime())
      })

      it("should return NaN for invalid DateFromString input", async () => {
        const t = setup()

        const result = await t.query(api.functions.queries.queryWithDateFromString, {
          date: "not-a-date",
        })

        expect(result).toBeNaN()
      })

      test("queryWithDateFromString types", () => {
        expectTypeOfRegisteredQueryArgs(queries.queryWithDateFromString).toEqualTypeOf<{
          date: string
        }>()
        expectTypeOfRegisteredQueryReturns(queries.queryWithDateFromString).toEqualTypeOf<
          Promise<number>
        >()
      })

      it("should decode nested struct with multiple transformations", async () => {
        const t = setup()
        const isoDate = "2024-01-15T10:30:00.000Z"

        const result = await t.query(api.functions.queries.queryWithNestedTransformations, {
          user: {
            age: "30",
            birthDate: isoDate,
          },
        })

        expect(result).toEqual({
          age: 30,
          timestamp: new Date(isoDate).getTime(),
        })
      })

      test("queryWithNestedTransformations types", () => {
        expectTypeOfRegisteredQueryArgs(queries.queryWithNestedTransformations).toEqualTypeOf<{
          user: {age: string; birthDate: string}
        }>()
        expectTypeOfRegisteredQueryReturns(queries.queryWithNestedTransformations).toEqualTypeOf<
          Promise<{age: number; timestamp: number}>
        >()
      })

      it("should decode array of transformed values", async () => {
        const t = setup()
        const dates = ["2024-01-01T00:00:00.000Z", "2024-06-15T12:00:00.000Z"]

        const result = await t.query(api.functions.queries.queryWithArrayOfDates, {
          dates,
        })

        expect(result).toEqual(dates.map((d) => new Date(d).getTime()))
      })

      test("queryWithArrayOfDates types", () => {
        expectTypeOfRegisteredQueryArgs(queries.queryWithArrayOfDates).toEqualTypeOf<{
          dates: string[]
        }>()
        expectTypeOfRegisteredQueryReturns(queries.queryWithArrayOfDates).toEqualTypeOf<
          Promise<number[]>
        >()
      })

      it("should decode optional transformed value when present", async () => {
        const t = setup()

        const result = await t.query(api.functions.queries.queryWithOptionalTransformation, {
          value: "21",
        })

        expect(result).toBe(42)
      })

      it("should handle optional transformed value when absent", async () => {
        const t = setup()

        const result = await t.query(api.functions.queries.queryWithOptionalTransformation, {})

        expect(result).toBeNull()
      })

      test("queryWithOptionalTransformation types", () => {
        expectTypeOfRegisteredQueryArgs(queries.queryWithOptionalTransformation).toEqualTypeOf<{
          value?: string | undefined
        }>()
        expectTypeOfRegisteredQueryReturns(queries.queryWithOptionalTransformation).toEqualTypeOf<
          Promise<number | null>
        >()
      })

      it("should decode deeply nested transformations (3+ levels)", async () => {
        const t = setup()
        const isoDate = "2024-03-20T15:45:00.000Z"

        const result = await t.query(api.functions.queries.queryWithDeeplyNestedTransformations, {
          level1: {
            level2: {
              level3: {
                value: "42",
                date: isoDate,
              },
            },
          },
        })

        expect(result).toEqual({
          value: 42,
          timestamp: new Date(isoDate).getTime(),
        })
      })

      test("queryWithDeeplyNestedTransformations types", () => {
        expectTypeOfRegisteredQueryArgs(
          queries.queryWithDeeplyNestedTransformations,
        ).toEqualTypeOf<{
          level1: {level2: {level3: {value: string; date: string}}}
        }>()
        expectTypeOfRegisteredQueryReturns(
          queries.queryWithDeeplyNestedTransformations,
        ).toEqualTypeOf<Promise<{value: number; timestamp: number}>>()
      })

      it("should decode nullable transformation when value is present", async () => {
        const t = setup()

        const result = await t.query(api.functions.queries.queryWithNullableTransformation, {
          value: "25",
        })

        expect(result).toBe(50)
      })

      it("should handle nullable transformation when value is null", async () => {
        const t = setup()

        const result = await t.query(api.functions.queries.queryWithNullableTransformation, {
          value: null,
        })

        expect(result).toBeNull()
      })

      test("queryWithNullableTransformation types", () => {
        expectTypeOfRegisteredQueryArgs(queries.queryWithNullableTransformation).toEqualTypeOf<{
          value: string | null
        }>()
        expectTypeOfRegisteredQueryReturns(queries.queryWithNullableTransformation).toEqualTypeOf<
          Promise<number | null>
        >()
      })

      it("should decode union type with number transformation", async () => {
        const t = setup()

        const result = await t.query(api.functions.queries.queryWithUnionTransformation, {
          value: {type: "number", data: "21"},
        })

        expect(result).toEqual({type: "number", result: 42})
      })

      it("should decode union type with date transformation", async () => {
        const t = setup()
        const isoDate = "2024-06-15T12:00:00.000Z"

        const result = await t.query(api.functions.queries.queryWithUnionTransformation, {
          value: {type: "date", data: isoDate},
        })

        expect(result).toEqual({type: "date", result: new Date(isoDate).getTime()})
      })

      test("queryWithUnionTransformation types", () => {
        expectTypeOfRegisteredQueryArgs(queries.queryWithUnionTransformation).toEqualTypeOf<{
          value: {type: "number"; data: string} | {type: "date"; data: string}
        }>()
        expectTypeOfRegisteredQueryReturns(queries.queryWithUnionTransformation).toEqualTypeOf<
          Promise<{type: "number"; result: number} | {type: "date"; result: number}>
        >()
      })

      it("should decode array of nested objects with multiple transformations", async () => {
        const t = setup()
        const date1 = "2024-01-01T00:00:00.000Z"
        const date2 = "2024-06-15T12:00:00.000Z"

        const result = await t.query(api.functions.queries.queryWithArrayOfNestedTransformations, {
          items: [
            {id: "1", timestamp: date1, nested: {value: "10"}},
            {id: "2", timestamp: date2, nested: {value: "20"}},
          ],
        })

        expect(result).toEqual([
          {id: 1, timestamp: new Date(date1).getTime(), nestedValue: 10},
          {id: 2, timestamp: new Date(date2).getTime(), nestedValue: 20},
        ])
      })

      test("queryWithArrayOfNestedTransformations types", () => {
        expectTypeOfRegisteredQueryArgs(
          queries.queryWithArrayOfNestedTransformations,
        ).toEqualTypeOf<{
          items: {id: string; timestamp: string; nested: {value: string}}[]
        }>()
        expectTypeOfRegisteredQueryReturns(
          queries.queryWithArrayOfNestedTransformations,
        ).toEqualTypeOf<Promise<{id: number; timestamp: number; nestedValue: number}[]>>()
      })
    })

    describe("returns transformations", () => {
      it("should decode NumberFromString - handler returns string, client receives number", async () => {
        const t = setup()

        const result = await t.query(api.functions.queries.queryReturnsNumber, {
          value: 21,
        })

        expect(typeof result).toBe("number")
        expect(result).toBe(42)
      })

      test("queryReturnsNumber types", () => {
        expectTypeOfRegisteredQueryArgs(queries.queryReturnsNumber).toEqualTypeOf<{value: number}>()
        expectTypeOfRegisteredQueryReturns(queries.queryReturnsNumber).toEqualTypeOf<
          Promise<number>
        >()
      })

      it("should return struct with transformed fields", async () => {
        const t = setup()

        const result = await t.query(api.functions.queries.queryReturnsStructWithTransformations, {
          value: 21,
        })

        expect(typeof result.doubledValue).toBe("number")
        expect(result.doubledValue).toBe(42)
        expect(typeof result.original).toBe("number")
        expect(result.original).toBe(21)
      })

      test("queryReturnsStructWithTransformations types", () => {
        expectTypeOfRegisteredQueryArgs(
          queries.queryReturnsStructWithTransformations,
        ).toEqualTypeOf<{
          value: number
        }>()
        expectTypeOfRegisteredQueryReturns(
          queries.queryReturnsStructWithTransformations,
        ).toEqualTypeOf<Promise<{doubledValue: number; original: number}>>()
      })

      it("should return deeply nested struct with transformations", async () => {
        const t = setup()

        const result = await t.query(
          api.functions.queries.queryReturnsDeeplyNestedTransformations,
          {
            value: 7,
          },
        )

        expect(result).toEqual({
          level1: {
            level2: {
              transformed: 21,
            },
          },
        })
        expect(typeof result.level1.level2.transformed).toBe("number")
      })

      test("queryReturnsDeeplyNestedTransformations types", () => {
        expectTypeOfRegisteredQueryArgs(
          queries.queryReturnsDeeplyNestedTransformations,
        ).toEqualTypeOf<{value: number}>()
        expectTypeOfRegisteredQueryReturns(
          queries.queryReturnsDeeplyNestedTransformations,
        ).toEqualTypeOf<Promise<{level1: {level2: {transformed: number}}}>>()
      })
    })
  })
})
