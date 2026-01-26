import type {Doc} from "../../convex/_generated/dataModel"

import {
  expectTypeOfRegisteredQueryArgs,
  expectTypeOfRegisteredQueryReturns,
} from "@apzelos/concave-internal/assert"
import {describe, expect, it, test} from "vitest"

import {api} from "../../convex/_generated/api"
import * as filter from "../../convex/functions/filter"
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

describe("Filter Queries", () => {
  describe("filter by priority", () => {
    it("should filter by priority threshold", async () => {
      const t = setup()

      await createTestItem(t, {name: "Low Priority", priority: 1})
      await createTestItem(t, {name: "High Priority", priority: 10})
      await createTestItem(t, {name: "Medium Priority", priority: 5})

      const highPriorityItems = await t.query(api.functions.filter.filterByPriority, {
        minPriority: 5,
      })

      expect(highPriorityItems).toHaveLength(2)
      expect(highPriorityItems.every((item: {priority: number}) => item.priority >= 5)).toBe(true)
    })

    it("should return all items when minPriority is 0", async () => {
      const t = setup()

      await createTestItem(t, {name: "Item 1", priority: 1})
      await createTestItem(t, {name: "Item 2", priority: 5})

      const items = await t.query(api.functions.filter.filterByPriority, {
        minPriority: 0,
      })

      expect(items).toHaveLength(2)
    })

    it("should return empty when no items match", async () => {
      const t = setup()

      await createTestItem(t, {name: "Low Priority", priority: 1})

      const items = await t.query(api.functions.filter.filterByPriority, {
        minPriority: 100,
      })

      expect(items).toEqual([])
    })

    test("filterByPriority types", () => {
      expectTypeOfRegisteredQueryArgs(filter.filterByPriority).toEqualTypeOf<{
        minPriority: number
      }>()
      expectTypeOfRegisteredQueryReturns(filter.filterByPriority).toEqualTypeOf<
        Promise<Doc<"items">[]>
      >()
    })
  })

  describe("filter by status", () => {
    it("should filter by active status", async () => {
      const t = setup()

      await createTestItem(t, {name: "Active Item", status: "active"})
      await createTestItem(t, {name: "Inactive Item", status: "inactive"})

      const activeItems = await t.query(api.functions.filter.filterByStatus, {
        status: "active",
      })

      expect(activeItems).toHaveLength(1)
      expect(activeItems[0]!.status).toBe("active")
    })

    it("should filter by inactive status", async () => {
      const t = setup()

      await createTestItem(t, {name: "Active Item", status: "active"})
      await createTestItem(t, {name: "Inactive Item", status: "inactive"})

      const inactiveItems = await t.query(api.functions.filter.filterByStatus, {
        status: "inactive",
      })

      expect(inactiveItems).toHaveLength(1)
      expect(inactiveItems[0]!.status).toBe("inactive")
    })

    test("filterByStatus types", () => {
      expectTypeOfRegisteredQueryArgs(filter.filterByStatus).toEqualTypeOf<{
        status: "active" | "inactive"
      }>()
      expectTypeOfRegisteredQueryReturns(filter.filterByStatus).toEqualTypeOf<
        Promise<Doc<"items">[]>
      >()
    })
  })

  describe("filter by category", () => {
    it("should filter by category", async () => {
      const t = setup()

      await createTestItem(t, {name: "Tech Item", category: "tech"})
      await createTestItem(t, {name: "Food Item", category: "food"})
      await createTestItem(t, {name: "Another Tech", category: "tech"})

      const techItems = await t.query(api.functions.filter.filterByCategory, {
        category: "tech",
      })

      expect(techItems).toHaveLength(2)
      expect(techItems.every((item: {category: string}) => item.category === "tech")).toBe(true)
    })

    test("filterByCategory types", () => {
      expectTypeOfRegisteredQueryArgs(filter.filterByCategory).toEqualTypeOf<{
        category: string
      }>()
      expectTypeOfRegisteredQueryReturns(filter.filterByCategory).toEqualTypeOf<
        Promise<Doc<"items">[]>
      >()
    })
  })

  describe("filter by multiple conditions", () => {
    it("should filter by multiple conditions", async () => {
      const t = setup()

      await createTestItem(t, {name: "Match", category: "tech", priority: 5, status: "active"})
      await createTestItem(t, {name: "Wrong Cat", category: "food", priority: 5, status: "active"})
      await createTestItem(t, {
        name: "Wrong Priority",
        category: "tech",
        priority: 1,
        status: "active",
      })
      await createTestItem(t, {
        name: "Wrong Status",
        category: "tech",
        priority: 5,
        status: "inactive",
      })

      const items = await t.query(api.functions.filter.filterByMultipleConditions, {
        category: "tech",
        minPriority: 5,
        status: "active",
      })

      expect(items).toHaveLength(1)
      expect(items[0]!.name).toBe("Match")
    })

    it("should return empty when no items match all conditions", async () => {
      const t = setup()

      await createTestItem(t, {category: "tech", priority: 1, status: "active"})
      await createTestItem(t, {category: "food", priority: 10, status: "active"})

      const items = await t.query(api.functions.filter.filterByMultipleConditions, {
        category: "tech",
        minPriority: 5,
        status: "active",
      })

      expect(items).toEqual([])
    })

    test("filterByMultipleConditions types", () => {
      expectTypeOfRegisteredQueryArgs(filter.filterByMultipleConditions).toEqualTypeOf<{
        category: string
        minPriority: number
        status: "active" | "inactive"
      }>()
      expectTypeOfRegisteredQueryReturns(filter.filterByMultipleConditions).toEqualTypeOf<
        Promise<Doc<"items">[]>
      >()
    })
  })

  describe("filter with content search", () => {
    it("should filter by content substring", async () => {
      const t = setup()

      await createTestItem(t, {name: "With Content", content: "This contains important info"})
      await createTestItem(t, {name: "Different Content", content: "Nothing special here"})
      await createTestItem(t, {name: "No Content"})

      const items = await t.query(api.functions.filter.filterWithContentSearch, {
        searchTerm: "important",
      })

      expect(items).toHaveLength(1)
      expect(items[0]!.name).toBe("With Content")
    })

    it("should handle items without content field", async () => {
      const t = setup()

      await createTestItem(t, {name: "No Content"})

      const items = await t.query(api.functions.filter.filterWithContentSearch, {
        searchTerm: "test",
      })

      expect(items).toEqual([])
    })

    test("filterWithContentSearch types", () => {
      expectTypeOfRegisteredQueryArgs(filter.filterWithContentSearch).toEqualTypeOf<{
        searchTerm: string
      }>()
      expectTypeOfRegisteredQueryReturns(filter.filterWithContentSearch).toEqualTypeOf<
        Promise<Doc<"items">[]>
      >()
    })
  })

  describe("filter chained with collect", () => {
    it("should chain filter with collect", async () => {
      const t = setup()

      await createTestItem(t, {name: "Low Value", value: 5})
      await createTestItem(t, {name: "High Value", value: 100})
      await createTestItem(t, {name: "Medium Value", value: 50})

      const items = await t.query(api.functions.filter.filterChainedWithCollect, {
        minValue: 50,
      })

      expect(items).toHaveLength(2)
      expect(items.every((item: {value: number}) => item.value >= 50)).toBe(true)
    })

    test("filterChainedWithCollect types", () => {
      expectTypeOfRegisteredQueryArgs(filter.filterChainedWithCollect).toEqualTypeOf<{
        minValue: number
      }>()
      expectTypeOfRegisteredQueryReturns(filter.filterChainedWithCollect).toEqualTypeOf<
        Promise<Doc<"items">[]>
      >()
    })
  })
})
