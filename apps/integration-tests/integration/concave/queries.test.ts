import {describe, expect, it} from "vitest"

import {api, internal} from "../../convex/_generated/api"
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
  return await t.run(async (ctx) => {
    return await ctx.db.insert("items", {
      name: overrides.name ?? "Test Item",
      category: overrides.category ?? "default",
      status: overrides.status ?? "active",
      priority: overrides.priority ?? 1,
      value: 0,
      content: overrides.content,
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
  })

  describe("Cross-Function Calls", () => {
    it("should call other query via runQuery", async () => {
      const t = setup()

      const result = await t.query(api.functions.queries.queryCallsQuery, {value: 5})

      expect(result).toBe("called: internal: 10")
    })
  })

  describe("Database Operations", () => {
    describe("fullTableScan", () => {
      it("should return all documents", async () => {
        const t = setup()

        await createTestItem(t, {name: "Item 1"})
        await createTestItem(t, {name: "Item 2"})
        await createTestItem(t, {name: "Item 3"})

        const items = await t.query(api.functions.queries.queryFullTableScan, {})

        expect(items).toHaveLength(3)
      })

      it("should return empty array when table is empty", async () => {
        const t = setup()

        const items = await t.query(api.functions.queries.queryFullTableScan, {})

        expect(items).toEqual([])
      })
    })

    describe("order", () => {
      it("should sort ascending", async () => {
        const t = setup()

        await createTestItem(t, {name: "First"})
        await createTestItem(t, {name: "Second"})

        const items = await t.query(api.functions.queries.queryWithOrderAsc, {})

        expect(items.length).toBeGreaterThanOrEqual(2)
        expect(items[0]!._creationTime).toBeLessThanOrEqual(items[1]!._creationTime)
      })

      it("should sort descending", async () => {
        const t = setup()

        await createTestItem(t, {name: "First"})
        await createTestItem(t, {name: "Second"})

        const items = await t.query(api.functions.queries.queryWithOrderDesc, {})

        expect(items.length).toBeGreaterThanOrEqual(2)
        expect(items[0]!._creationTime).toBeGreaterThanOrEqual(items[1]!._creationTime)
      })
    })

    describe("take", () => {
      it("should limit results to N", async () => {
        const t = setup()

        await createTestItem(t, {name: "Item 1"})
        await createTestItem(t, {name: "Item 2"})
        await createTestItem(t, {name: "Item 3"})

        const items = await t.query(api.functions.queries.queryWithTake, {count: 2})

        expect(items).toHaveLength(2)
      })

      it("should return all if N exceeds total", async () => {
        const t = setup()

        await createTestItem(t, {name: "Only Item"})

        const items = await t.query(api.functions.queries.queryWithTake, {count: 10})

        expect(items).toHaveLength(1)
      })
    })

    describe("first", () => {
      it("should return first document", async () => {
        const t = setup()

        await createTestItem(t, {name: "First Item"})
        await createTestItem(t, {name: "Second Item"})

        const item = await t.query(api.functions.queries.queryFirst, {})

        expect(item).toBeDefined()
        expect(item?.name).toBe("First Item")
      })

      it("should return null when empty", async () => {
        const t = setup()

        const item = await t.query(api.functions.queries.queryFirst, {})

        expect(item).toBeNull()
      })
    })

    describe("withIndex", () => {
      it("should filter by index field", async () => {
        const t = setup()

        await createTestItem(t, {name: "Cat Item", category: "animals"})
        await createTestItem(t, {name: "Dog Item", category: "animals"})
        await createTestItem(t, {name: "Car Item", category: "vehicles"})

        const animals = await t.query(api.functions.queries.queryWithIndex, {
          category: "animals",
        })

        expect(animals).toHaveLength(2)
        expect(animals.every((item: {category: string}) => item.category === "animals")).toBe(true)
      })

      it("should return empty when no match", async () => {
        const t = setup()

        await createTestItem(t, {name: "Item", category: "other"})

        const items = await t.query(api.functions.queries.queryWithIndex, {
          category: "nonexistent",
        })

        expect(items).toEqual([])
      })
    })

    describe("unique", () => {
      it("should return document when exactly one", async () => {
        const t = setup()

        await createTestItem(t, {name: "Unique Item", category: "unique-cat"})

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

        await createTestItem(t, {name: "Item 1", category: "duplicate"})
        await createTestItem(t, {name: "Item 2", category: "duplicate"})

        await expect(
          t.query(api.functions.queries.queryUnique, {category: "duplicate"}),
        ).rejects.toThrow()
      })
    })

    describe("paginate", () => {
      it("should return first page with cursor", async () => {
        const t = setup()

        for (let i = 0; i < 5; i++) {
          await createTestItem(t, {name: `Item ${i}`})
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
          await createTestItem(t, {name: `Item ${i}`})
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

        await createTestItem(t, {name: "Single Item"})

        const result = await t.query(api.functions.queries.queryPaginate, {
          paginationOpts: {numItems: 10, cursor: null},
        })

        expect(result.page).toHaveLength(1)
        expect(result.isDone).toBe(true)
      })
    })

    describe("compound indexes", () => {
      it("should filter by multiple index fields", async () => {
        const t = setup()

        await createTestItem(t, {category: "tech", status: "active"})
        await createTestItem(t, {category: "tech", status: "inactive"})
        await createTestItem(t, {category: "food", status: "active"})

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

        await createTestItem(t, {category: "tech", status: "active"})
        await createTestItem(t, {category: "tech", status: "inactive"})
        await createTestItem(t, {category: "food", status: "active"})

        const items = await t.query(api.functions.queries.queryCompoundIndexPartial, {
          category: "tech",
        })

        expect(items).toHaveLength(2)
        expect(items.every((item: {category: string}) => item.category === "tech")).toBe(true)
      })
    })

    describe("search", () => {
      it("should find documents by text", async () => {
        const t = setup()

        await createTestItem(t, {name: "Cat Article", content: "Cats are wonderful pets"})
        await createTestItem(t, {name: "Dog Article", content: "Dogs are loyal companions"})

        const results = await t.query(api.functions.queries.querySearch, {
          searchText: "cats wonderful",
        })

        expect(Array.isArray(results)).toBe(true)
      })

      it("should return empty when no match", async () => {
        const t = setup()

        await createTestItem(t, {name: "Item", content: "Some content"})

        const results = await t.query(api.functions.queries.querySearch, {
          searchText: "elephants",
        })

        expect(results).toEqual([])
      })
    })

    describe("filter", () => {
      it("should apply filter to results", async () => {
        const t = setup()

        await createTestItem(t, {name: "Low Priority", priority: 1})
        await createTestItem(t, {name: "High Priority", priority: 10})
        await createTestItem(t, {name: "Medium Priority", priority: 5})

        const highPriorityItems = await t.query(api.functions.queries.queryWithFilter, {
          minPriority: 5,
        })

        expect(highPriorityItems).toHaveLength(2)
        expect(highPriorityItems.every((item: {priority: number}) => item.priority >= 5)).toBe(true)
      })
    })

    describe("get", () => {
      it("should return document by ID", async () => {
        const t = setup()

        const id = await createTestItem(t, {name: "Get Test"})

        const item = await t.query(api.functions.queries.queryGet, {id})

        expect(item).toBeDefined()
        expect(item?.name).toBe("Get Test")
      })

      it("should return null for non-existent ID", async () => {
        const t = setup()

        // Create and delete to get a valid but non-existent ID format
        const id = await createTestItem(t, {name: "Temp"})
        await t.run(async (ctx) => {
          await ctx.db.delete(id)
        })

        const item = await t.query(api.functions.queries.queryGet, {id})

        expect(item).toBeNull()
      })
    })

    describe("normalizeId", () => {
      it("should return valid ID unchanged", async () => {
        const t = setup()

        const id = await createTestItem(t, {name: "Test"})

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

      it("should decode array of transformed values", async () => {
        const t = setup()
        const dates = ["2024-01-01T00:00:00.000Z", "2024-06-15T12:00:00.000Z"]

        const result = await t.query(api.functions.queries.queryWithArrayOfDates, {
          dates,
        })

        expect(result).toEqual(dates.map((d) => new Date(d).getTime()))
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
    })
  })
})
