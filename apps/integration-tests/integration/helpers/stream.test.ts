import type {Id} from "../../convex/_generated/dataModel"

import {describe, expect, it} from "vitest"

import {api} from "../../convex/_generated/api"
import {setup} from "../../setup"

async function createTestItem(
  t: ReturnType<typeof setup>,
  overrides: {
    name?: string
    category?: string
    status?: "active" | "inactive"
    priority?: number
    value?: number
    content?: string
  } = {},
) {
  return await t.run(async (ctx) => {
    return await ctx.db.insert("items", {
      name: overrides.name ?? "Test Item",
      category: overrides.category ?? "default",
      status: overrides.status ?? "active",
      priority: overrides.priority ?? 1,
      value: overrides.value ?? 0,
      content: overrides.content,
      createdAt: Date.now(),
    })
  })
}

async function createTestDetail(t: ReturnType<typeof setup>, itemId: Id<"items">, info: string) {
  return await t.run(async (ctx) => {
    return await ctx.db.insert("details", {
      itemId,
      info,
    })
  })
}

describe("Stream Queries", () => {
  describe("fullTableScan", () => {
    it("should return all documents", async () => {
      const t = setup()

      await createTestItem(t, {name: "Item 1"})
      await createTestItem(t, {name: "Item 2"})
      await createTestItem(t, {name: "Item 3"})

      const items = await t.query(api.functions.stream.streamFullTableScan, {})

      expect(items).toHaveLength(3)
    })

    it("should return empty array when table is empty", async () => {
      const t = setup()

      const items = await t.query(api.functions.stream.streamFullTableScan, {})

      expect(items).toEqual([])
    })
  })

  describe("withIndex", () => {
    it("should filter by single index field", async () => {
      const t = setup()

      await createTestItem(t, {name: "Cat Item", category: "animals"})
      await createTestItem(t, {name: "Dog Item", category: "animals"})
      await createTestItem(t, {name: "Car Item", category: "vehicles"})

      const animals = await t.query(api.functions.stream.streamWithIndex, {
        category: "animals",
      })

      expect(animals).toHaveLength(2)
      expect(animals.every((item: {category: string}) => item.category === "animals")).toBe(true)
    })

    it("should return empty when no match", async () => {
      const t = setup()

      await createTestItem(t, {name: "Item", category: "other"})

      const items = await t.query(api.functions.stream.streamWithIndex, {
        category: "nonexistent",
      })

      expect(items).toEqual([])
    })
  })

  describe("compound index", () => {
    it("should filter by compound index fields", async () => {
      const t = setup()

      await createTestItem(t, {category: "tech", status: "active"})
      await createTestItem(t, {category: "tech", status: "inactive"})
      await createTestItem(t, {category: "food", status: "active"})

      const items = await t.query(api.functions.stream.streamWithCompoundIndex, {
        category: "tech",
        status: "active",
      })

      expect(items).toHaveLength(1)
      expect(items[0]!.category).toBe("tech")
      expect(items[0]!.status).toBe("active")
    })
  })

  describe("order", () => {
    it("should sort ascending", async () => {
      const t = setup()

      await createTestItem(t, {name: "First"})
      await createTestItem(t, {name: "Second"})

      const items = await t.query(api.functions.stream.streamOrderAsc, {})

      expect(items.length).toBeGreaterThanOrEqual(2)
      expect(items[0]!._creationTime).toBeLessThanOrEqual(items[1]!._creationTime)
    })

    it("should sort descending", async () => {
      const t = setup()

      await createTestItem(t, {name: "First"})
      await createTestItem(t, {name: "Second"})

      const items = await t.query(api.functions.stream.streamOrderDesc, {})

      expect(items.length).toBeGreaterThanOrEqual(2)
      expect(items[0]!._creationTime).toBeGreaterThanOrEqual(items[1]!._creationTime)
    })
  })

  describe("collect", () => {
    it("should return all matches", async () => {
      const t = setup()

      await createTestItem(t, {name: "Item 1"})
      await createTestItem(t, {name: "Item 2"})

      const items = await t.query(api.functions.stream.streamCollect, {})

      expect(items).toHaveLength(2)
    })
  })

  describe("take", () => {
    it("should limit results to n", async () => {
      const t = setup()

      await createTestItem(t, {name: "Item 1"})
      await createTestItem(t, {name: "Item 2"})
      await createTestItem(t, {name: "Item 3"})

      const items = await t.query(api.functions.stream.streamTake, {n: 2})

      expect(items).toHaveLength(2)
    })

    it("should return all if n exceeds total", async () => {
      const t = setup()

      await createTestItem(t, {name: "Only Item"})

      const items = await t.query(api.functions.stream.streamTake, {n: 10})

      expect(items).toHaveLength(1)
    })
  })

  describe("first", () => {
    it("should return first document", async () => {
      const t = setup()

      await createTestItem(t, {name: "First Item"})
      await createTestItem(t, {name: "Second Item"})

      const item = await t.query(api.functions.stream.streamFirst, {})

      expect(item).toBeDefined()
      expect(item?.name).toBe("First Item")
    })

    it("should return null when empty", async () => {
      const t = setup()

      const item = await t.query(api.functions.stream.streamFirst, {})

      expect(item).toBeNull()
    })
  })

  describe("unique", () => {
    it("should return single match", async () => {
      const t = setup()

      await createTestItem(t, {name: "Unique Item", category: "unique-cat"})

      const item = await t.query(api.functions.stream.streamUnique, {
        category: "unique-cat",
      })

      expect(item).toBeDefined()
      expect(item?.category).toBe("unique-cat")
    })

    it("should return null when none", async () => {
      const t = setup()

      const item = await t.query(api.functions.stream.streamUnique, {
        category: "nonexistent",
      })

      expect(item).toBeNull()
    })

    it("should throw DocNotUniqueError when multiple", async () => {
      const t = setup()

      await createTestItem(t, {name: "Item 1", category: "duplicate"})
      await createTestItem(t, {name: "Item 2", category: "duplicate"})

      await expect(
        t.query(api.functions.stream.streamUnique, {category: "duplicate"}),
      ).rejects.toThrow()
    })
  })

  describe("filterWith", () => {
    it("should filter with Effect predicate", async () => {
      const t = setup()

      await createTestItem(t, {name: "Low Value", value: 5})
      await createTestItem(t, {name: "High Value", value: 100})
      await createTestItem(t, {name: "Medium Value", value: 50})

      const highValueItems = await t.query(api.functions.stream.streamFilterWith, {
        minValue: 50,
      })

      expect(highValueItems).toHaveLength(2)
      expect(highValueItems.every((item: {value: number}) => item.value >= 50)).toBe(true)
    })

    it("should support DB lookups in predicate", async () => {
      const t = setup()

      const item1Id = await createTestItem(t, {name: "Item with detail"})
      await createTestDetail(t, item1Id, "important")
      const item2Id = await createTestItem(t, {name: "Item without important detail"})
      await createTestDetail(t, item2Id, "other")

      const items = await t.query(api.functions.stream.streamFilterWithDbLookup, {
        requiredDetailInfo: "important",
      })

      expect(items).toHaveLength(1)
      expect(items[0]!.name).toBe("Item with detail")
    })
  })

  describe("map", () => {
    it("should transform documents", async () => {
      const t = setup()

      await createTestItem(t, {name: "Test Item", value: 10})

      const items = await t.query(api.functions.stream.streamMap, {})

      expect(items).toHaveLength(1)
      expect(items[0]).toHaveProperty("id")
      expect(items[0]).toHaveProperty("name", "Test Item")
      expect(items[0]).toHaveProperty("doubled", 20)
    })

    it("should handle null returns (filter out)", async () => {
      const t = setup()

      await createTestItem(t, {name: "Keep", category: "wanted"})
      await createTestItem(t, {name: "Skip", category: "other"})

      const items = await t.query(api.functions.stream.streamMapWithNull, {
        filterCategory: "wanted",
      })

      expect(items).toHaveLength(1)
      expect(items[0]!.name).toBe("Keep")
    })
  })

  describe("flatMap", () => {
    it("should expand to related records", async () => {
      const t = setup()

      const item1Id = await createTestItem(t, {name: "Item 1"})
      await createTestDetail(t, item1Id, "Detail 1a")
      await createTestDetail(t, item1Id, "Detail 1b")

      const item2Id = await createTestItem(t, {name: "Item 2"})
      await createTestDetail(t, item2Id, "Detail 2a")

      const details = await t.query(api.functions.stream.streamFlatMap, {})

      expect(details).toHaveLength(3)
      expect(details.every((d: {info: string}) => d.info.startsWith("Detail"))).toBe(true)
    })
  })

  describe("distinct", () => {
    it("should return first per distinct field", async () => {
      const t = setup()

      await createTestItem(t, {name: "Cat 1", category: "animals"})
      await createTestItem(t, {name: "Cat 2", category: "animals"})
      await createTestItem(t, {name: "Car", category: "vehicles"})

      const items = await t.query(api.functions.stream.streamDistinct, {})

      expect(items).toHaveLength(2)
      const categories = items.map((item: {category: string}) => item.category)
      expect(categories).toContain("animals")
      expect(categories).toContain("vehicles")
    })
  })

  describe("paginate", () => {
    it("should support cursor-based pagination", async () => {
      const t = setup()

      for (let i = 0; i < 5; i++) {
        await createTestItem(t, {name: `Item ${i}`})
      }

      const firstPage = await t.query(api.functions.stream.streamPaginate, {
        paginationOpts: {numItems: 2, cursor: null},
      })

      expect(firstPage.page).toHaveLength(2)
      expect(firstPage.isDone).toBe(false)
      expect(firstPage.continueCursor).toBeDefined()

      const secondPage = await t.query(api.functions.stream.streamPaginate, {
        paginationOpts: {numItems: 2, cursor: firstPage.continueCursor},
      })

      expect(secondPage.page).toHaveLength(2)
      const firstPageIds = firstPage.page.map((item: {_id: string}) => item._id)
      const secondPageIds = secondPage.page.map((item: {_id: string}) => item._id)
      expect(firstPageIds.some((id: string) => secondPageIds.includes(id))).toBe(false)
    })
  })

  describe("mergedStream", () => {
    it("should combine multiple streams", async () => {
      const t = setup()

      await createTestItem(t, {name: "Animal", category: "animals"})
      await createTestItem(t, {name: "Vehicle", category: "vehicles"})
      await createTestItem(t, {name: "Other", category: "other"})

      const items = await t.query(api.functions.stream.streamMerged, {
        categories: ["animals", "vehicles"],
      })

      expect(items).toHaveLength(2)
      const categories = items.map((item: {category: string}) => item.category)
      expect(categories).toContain("animals")
      expect(categories).toContain("vehicles")
      expect(categories).not.toContain("other")
    })
  })

  describe("value index range", () => {
    it("should filter by index range", async () => {
      const t = setup()

      await createTestItem(t, {name: "Low", value: 10})
      await createTestItem(t, {name: "Mid", value: 50})
      await createTestItem(t, {name: "High", value: 100})

      const items = await t.query(api.functions.stream.streamWithValueIndex, {
        minValue: 25,
        maxValue: 75,
      })

      expect(items).toHaveLength(1)
      expect(items[0]!.name).toBe("Mid")
    })
  })
})
