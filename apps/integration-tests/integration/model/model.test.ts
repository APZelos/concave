/* eslint-disable @typescript-eslint/no-empty-object-type */
import type {PaginationResult} from "convex/server"
import type {GenericId} from "convex/values"
import type {Doc, Id} from "../../convex/_generated/dataModel"

import {
  expectTypeOfRegisteredMutationArgs,
  expectTypeOfRegisteredMutationReturns,
  expectTypeOfRegisteredQueryArgs,
  expectTypeOfRegisteredQueryReturns,
} from "@apzelos/concave-internal/assert"
import {describe, expect, it, test} from "vitest"

import {api} from "../../convex/_generated/api"
import * as model from "../../convex/functions/model"
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

describe("Model", () => {
  describe("normalizeId", () => {
    it("should return the normalized ID for a valid ID string", async () => {
      const t = setup()
      const id = await createTestItem(t)

      const result = await t.query(api.functions.model.modelNormalizeId, {
        idString: id,
      })

      expect(result).toBe(id)
    })

    it("should throw InvalidDocIdError for an invalid ID string", async () => {
      const t = setup()

      await expect(
        t.query(api.functions.model.modelNormalizeId, {
          idString: "invalid-id",
        }),
      ).rejects.toThrow()
    })

    test("modelNormalizeId types", () => {
      expectTypeOfRegisteredQueryArgs(model.modelNormalizeId).toEqualTypeOf<{
        idString: string
      }>()
      expectTypeOfRegisteredQueryReturns(model.modelNormalizeId).toEqualTypeOf<
        Promise<GenericId<"items">>
      >()
    })
  })

  describe("normalizeIdNullable", () => {
    it("should return the normalized ID for a valid ID string", async () => {
      const t = setup()
      const id = await createTestItem(t)

      const result = await t.query(api.functions.model.modelNormalizeIdNullable, {
        idString: id,
      })

      expect(result).toBe(id)
    })

    it("should return null for an invalid ID string", async () => {
      const t = setup()

      const result = await t.query(api.functions.model.modelNormalizeIdNullable, {
        idString: "invalid-id",
      })

      expect(result).toBeNull()
    })

    test("modelNormalizeIdNullable types", () => {
      expectTypeOfRegisteredQueryArgs(model.modelNormalizeIdNullable).toEqualTypeOf<{
        idString: string
      }>()
      expectTypeOfRegisteredQueryReturns(model.modelNormalizeIdNullable).toEqualTypeOf<
        Promise<GenericId<"items"> | null>
      >()
    })
  })

  describe("normalizeIdOption", () => {
    it("should return the normalized ID for a valid ID string", async () => {
      const t = setup()
      const id = await createTestItem(t)

      const result = await t.query(api.functions.model.modelNormalizeIdOption, {
        idString: id,
      })

      expect(result).toBe(id)
    })

    it("should return null (Option.none) for an invalid ID string", async () => {
      const t = setup()

      const result = await t.query(api.functions.model.modelNormalizeIdOption, {
        idString: "invalid-id",
      })

      expect(result).toBeNull()
    })

    test("modelNormalizeIdOption types", () => {
      expectTypeOfRegisteredQueryArgs(model.modelNormalizeIdOption).toEqualTypeOf<{
        idString: string
      }>()
      expectTypeOfRegisteredQueryReturns(model.modelNormalizeIdOption).toEqualTypeOf<
        Promise<GenericId<"items"> | null>
      >()
    })
  })

  describe("getById", () => {
    it("should return decoded document when found", async () => {
      const t = setup()
      const id = await createTestItem(t, {name: "Found Item", priority: 5})

      const result = await t.query(api.functions.model.modelGetById, {id})

      expect(result).toMatchObject({
        _id: id,
        name: "Found Item",
        priority: 5,
      })
    })

    it("should throw DocNotFoundError when document does not exist", async () => {
      const t = setup()
      const id = await createTestItem(t)
      await t.run(async (ctx) => {
        await ctx.db.delete(id)
      })

      await expect(t.query(api.functions.model.modelGetById, {id})).rejects.toThrow()
    })

    test("modelGetById types", () => {
      expectTypeOfRegisteredQueryArgs(model.modelGetById).toEqualTypeOf<{
        id: GenericId<"items">
      }>()
      expectTypeOfRegisteredQueryReturns(model.modelGetById).toEqualTypeOf<Promise<Doc<"items">>>()
    })
  })

  describe("getByIdNullable", () => {
    it("should return decoded document when found", async () => {
      const t = setup()
      const id = await createTestItem(t, {name: "Found Item"})

      const result = await t.query(api.functions.model.modelGetByIdNullable, {id})

      expect(result).toMatchObject({
        _id: id,
        name: "Found Item",
      })
    })

    it("should return null when document does not exist", async () => {
      const t = setup()
      const id = await createTestItem(t)
      await t.run(async (ctx) => {
        await ctx.db.delete(id)
      })

      const result = await t.query(api.functions.model.modelGetByIdNullable, {id})

      expect(result).toBeNull()
    })

    test("modelGetByIdNullable types", () => {
      expectTypeOfRegisteredQueryArgs(model.modelGetByIdNullable).toEqualTypeOf<{
        id: GenericId<"items">
      }>()
      expectTypeOfRegisteredQueryReturns(model.modelGetByIdNullable).toEqualTypeOf<
        Promise<Doc<"items"> | null>
      >()
    })
  })

  describe("getByIdOption", () => {
    it("should return decoded document when found", async () => {
      const t = setup()
      const id = await createTestItem(t, {name: "Found Item"})

      const result = await t.query(api.functions.model.modelGetByIdOption, {id})

      expect(result).toMatchObject({
        _id: id,
        name: "Found Item",
      })
    })

    it("should return null (Option.none) when document does not exist", async () => {
      const t = setup()
      const id = await createTestItem(t)
      await t.run(async (ctx) => {
        await ctx.db.delete(id)
      })

      const result = await t.query(api.functions.model.modelGetByIdOption, {id})

      expect(result).toBeNull()
    })

    test("modelGetByIdOption types", () => {
      expectTypeOfRegisteredQueryArgs(model.modelGetByIdOption).toEqualTypeOf<{
        id: GenericId<"items">
      }>()
      expectTypeOfRegisteredQueryReturns(model.modelGetByIdOption).toEqualTypeOf<
        Promise<Doc<"items"> | null>
      >()
    })
  })

  describe("insert", () => {
    it("should insert valid data and return the document ID", async () => {
      const t = setup()

      const id = await t.mutation(api.functions.model.modelInsert, {
        name: "New Item",
        category: "test",
        status: "active",
        priority: 1,
        value: 100,
        createdAt: Date.now(),
      })

      expect(id).toBeDefined()

      const doc = await t.run(async (ctx) => ctx.db.get(id))
      expect(doc).toMatchObject({
        name: "New Item",
        category: "test",
        status: "active",
        priority: 1,
        value: 100,
      })
    })

    it("should reject invalid data - non-positive priority", async () => {
      const t = setup()

      await expect(
        t.mutation(api.functions.model.modelInsert, {
          name: "Invalid Item",
          category: "test",
          status: "active",
          priority: 0,
          value: 0,
          createdAt: Date.now(),
        }),
      ).rejects.toThrow()
    })

    it("should reject invalid data - empty name", async () => {
      const t = setup()

      await expect(
        t.mutation(api.functions.model.modelInsert, {
          name: "",
          category: "test",
          status: "active",
          priority: 1,
          value: 0,
          createdAt: Date.now(),
        }),
      ).rejects.toThrow()
    })

    test("modelInsert types", () => {
      expectTypeOfRegisteredMutationArgs(model.modelInsert).toEqualTypeOf<{
        name: string
        category: string
        status: "active" | "inactive"
        priority: number
        value: number
        content?: string | undefined
        createdAt: number
      }>()
      expectTypeOfRegisteredMutationReturns(model.modelInsert).toEqualTypeOf<
        Promise<GenericId<"items">>
      >()
    })
  })

  describe("insertAndGet", () => {
    it("should insert and return the decoded document", async () => {
      const t = setup()

      const result = await t.mutation(api.functions.model.modelInsertAndGet, {
        name: "New Item",
        category: "test",
        status: "active",
        priority: 2,
        value: 50,
        createdAt: Date.now(),
      })

      expect(result).toMatchObject({
        name: "New Item",
        category: "test",
        status: "active",
        priority: 2,
        value: 50,
      })
      expect(result._id).toBeDefined()
      expect(result._creationTime).toBeDefined()
    })

    it("should reject invalid data on insertAndGet", async () => {
      const t = setup()

      await expect(
        t.mutation(api.functions.model.modelInsertAndGet, {
          name: "Invalid",
          category: "test",
          status: "active",
          priority: -1,
          value: 0,
          createdAt: Date.now(),
        }),
      ).rejects.toThrow()
    })

    test("modelInsertAndGet types", () => {
      expectTypeOfRegisteredMutationArgs(model.modelInsertAndGet).toEqualTypeOf<{
        name: string
        category: string
        status: "active" | "inactive"
        priority: number
        value: number
        content?: string | undefined
        createdAt: number
      }>()
      expectTypeOfRegisteredMutationReturns(model.modelInsertAndGet).toEqualTypeOf<
        Promise<Doc<"items">>
      >()
    })
  })

  describe("patchById", () => {
    it("should patch document with valid partial data", async () => {
      const t = setup()
      const id = await createTestItem(t, {name: "Original", value: 10})

      await t.mutation(api.functions.model.modelPatchById, {
        id,
        value: 20,
      })

      const doc = await t.run(async (ctx) => ctx.db.get(id))
      expect(doc?.value).toBe(20)
      expect(doc?.name).toBe("Original")
    })

    it("should reject invalid patch data - non-positive priority", async () => {
      const t = setup()
      const id = await createTestItem(t)

      await expect(
        t.mutation(api.functions.model.modelPatchById, {
          id,
          priority: 0,
        }),
      ).rejects.toThrow()
    })

    test("modelPatchById types", () => {
      expectTypeOfRegisteredMutationArgs(model.modelPatchById).toEqualTypeOf<{
        id: GenericId<"items">
        name?: string | undefined
        category?: string | undefined
        status?: "active" | "inactive" | undefined
        priority?: number | undefined
        value?: number | undefined
        content?: string | undefined
      }>()
      expectTypeOfRegisteredMutationReturns(model.modelPatchById).toEqualTypeOf<Promise<void>>()
    })
  })

  describe("patchByIdAndGet", () => {
    it("should patch and return the decoded document", async () => {
      const t = setup()
      const id = await createTestItem(t, {name: "Original", value: 10})

      const result = await t.mutation(api.functions.model.modelPatchByIdAndGet, {
        id,
        value: 30,
      })

      expect(result).toMatchObject({
        _id: id,
        name: "Original",
        value: 30,
      })
    })

    test("modelPatchByIdAndGet types", () => {
      expectTypeOfRegisteredMutationArgs(model.modelPatchByIdAndGet).toEqualTypeOf<{
        id: GenericId<"items">
        name?: string | undefined
        category?: string | undefined
        status?: "active" | "inactive" | undefined
        priority?: number | undefined
        value?: number | undefined
        content?: string | undefined
      }>()
      expectTypeOfRegisteredMutationReturns(model.modelPatchByIdAndGet).toEqualTypeOf<
        Promise<Doc<"items">>
      >()
    })
  })

  describe("replaceById", () => {
    it("should replace document with valid complete data", async () => {
      const t = setup()
      const id = await createTestItem(t, {name: "Original", value: 10})

      await t.mutation(api.functions.model.modelReplaceById, {
        id,
        name: "Replaced",
        category: "new-category",
        status: "inactive",
        priority: 5,
        value: 100,
        createdAt: Date.now(),
      })

      const doc = await t.run(async (ctx) => ctx.db.get(id))
      expect(doc).toMatchObject({
        name: "Replaced",
        category: "new-category",
        status: "inactive",
        priority: 5,
        value: 100,
      })
    })

    it("should reject invalid replace data", async () => {
      const t = setup()
      const id = await createTestItem(t)

      await expect(
        t.mutation(api.functions.model.modelReplaceById, {
          id,
          name: "Replaced",
          category: "test",
          status: "active",
          priority: 0, // invalid - must be positive
          value: 0,
          createdAt: Date.now(),
        }),
      ).rejects.toThrow()
    })

    test("modelReplaceById types", () => {
      expectTypeOfRegisteredMutationArgs(model.modelReplaceById).toEqualTypeOf<{
        id: GenericId<"items">
        name: string
        category: string
        status: "active" | "inactive"
        priority: number
        value: number
        content?: string | undefined
        createdAt: number
      }>()
      expectTypeOfRegisteredMutationReturns(model.modelReplaceById).toEqualTypeOf<Promise<void>>()
    })
  })

  describe("replaceByIdAndGet", () => {
    it("should replace and return the decoded document", async () => {
      const t = setup()
      const id = await createTestItem(t)

      const result = await t.mutation(api.functions.model.modelReplaceByIdAndGet, {
        id,
        name: "Replaced Item",
        category: "replaced",
        status: "inactive",
        priority: 3,
        value: 50,
        createdAt: Date.now(),
      })

      expect(result).toMatchObject({
        _id: id,
        name: "Replaced Item",
        category: "replaced",
        status: "inactive",
        priority: 3,
        value: 50,
      })
    })

    test("modelReplaceByIdAndGet types", () => {
      expectTypeOfRegisteredMutationArgs(model.modelReplaceByIdAndGet).toEqualTypeOf<{
        id: GenericId<"items">
        name: string
        category: string
        status: "active" | "inactive"
        priority: number
        value: number
        content?: string | undefined
        createdAt: number
      }>()
      expectTypeOfRegisteredMutationReturns(model.modelReplaceByIdAndGet).toEqualTypeOf<
        Promise<Doc<"items">>
      >()
    })
  })

  describe("deleteById", () => {
    it("should delete the document", async () => {
      const t = setup()
      const id = await createTestItem(t)

      await t.mutation(api.functions.model.modelDeleteById, {id})

      const doc = await t.run(async (ctx) => ctx.db.get(id))
      expect(doc).toBeNull()
    })

    test("modelDeleteById types", () => {
      expectTypeOfRegisteredMutationArgs(model.modelDeleteById).toEqualTypeOf<{
        id: GenericId<"items">
      }>()
      expectTypeOfRegisteredMutationReturns(model.modelDeleteById).toEqualTypeOf<Promise<void>>()
    })
  })

  describe("collect", () => {
    it("should return all decoded documents", async () => {
      const t = setup()

      await createTestItem(t, {name: "Item 1"})
      await createTestItem(t, {name: "Item 2"})
      await createTestItem(t, {name: "Item 3"})

      const items = await t.query(api.functions.model.modelCollect, {})

      expect(items).toHaveLength(3)
      expect(items.every((item: {name: string}) => item.name.startsWith("Item"))).toBe(true)
    })

    it("should return empty array when no documents", async () => {
      const t = setup()

      const items = await t.query(api.functions.model.modelCollect, {})

      expect(items).toEqual([])
    })

    test("modelCollect types", () => {
      expectTypeOfRegisteredQueryArgs(model.modelCollect).toEqualTypeOf<{}>()
      expectTypeOfRegisteredQueryReturns(model.modelCollect).toEqualTypeOf<
        Promise<Doc<"items">[]>
      >()
    })
  })

  describe("take", () => {
    it("should limit decoded documents to n", async () => {
      const t = setup()

      await createTestItem(t, {name: "Item 1"})
      await createTestItem(t, {name: "Item 2"})
      await createTestItem(t, {name: "Item 3"})

      const items = await t.query(api.functions.model.modelTake, {n: 2})

      expect(items).toHaveLength(2)
    })

    it("should return all if n exceeds total", async () => {
      const t = setup()

      await createTestItem(t, {name: "Only Item"})

      const items = await t.query(api.functions.model.modelTake, {n: 10})

      expect(items).toHaveLength(1)
    })

    test("modelTake types", () => {
      expectTypeOfRegisteredQueryArgs(model.modelTake).toEqualTypeOf<{n: number}>()
      expectTypeOfRegisteredQueryReturns(model.modelTake).toEqualTypeOf<Promise<Doc<"items">[]>>()
    })
  })

  describe("first", () => {
    it("should return first decoded document", async () => {
      const t = setup()

      await createTestItem(t, {name: "First Item"})
      await createTestItem(t, {name: "Second Item"})

      const item = await t.query(api.functions.model.modelFirst, {})

      expect(item).toBeDefined()
      expect(item?.name).toBe("First Item")
    })

    it("should return null when empty", async () => {
      const t = setup()

      const item = await t.query(api.functions.model.modelFirst, {})

      expect(item).toBeNull()
    })

    test("modelFirst types", () => {
      expectTypeOfRegisteredQueryArgs(model.modelFirst).toEqualTypeOf<{}>()
      expectTypeOfRegisteredQueryReturns(model.modelFirst).toEqualTypeOf<
        Promise<Doc<"items"> | null>
      >()
    })
  })

  describe("unique", () => {
    it("should return single match as decoded document", async () => {
      const t = setup()

      await createTestItem(t, {name: "Unique Item", category: "unique-cat"})

      const item = await t.query(api.functions.model.modelUnique, {
        category: "unique-cat",
      })

      expect(item).toBeDefined()
      expect(item?.category).toBe("unique-cat")
    })

    it("should return null when no match", async () => {
      const t = setup()

      const item = await t.query(api.functions.model.modelUnique, {
        category: "nonexistent",
      })

      expect(item).toBeNull()
    })

    it("should throw DocNotUniqueError when multiple matches", async () => {
      const t = setup()

      await createTestItem(t, {name: "Item 1", category: "duplicate"})
      await createTestItem(t, {name: "Item 2", category: "duplicate"})

      await expect(
        t.query(api.functions.model.modelUnique, {category: "duplicate"}),
      ).rejects.toThrow()
    })

    test("modelUnique types", () => {
      expectTypeOfRegisteredQueryArgs(model.modelUnique).toEqualTypeOf<{category: string}>()
      expectTypeOfRegisteredQueryReturns(model.modelUnique).toEqualTypeOf<
        Promise<Doc<"items"> | null>
      >()
    })
  })

  describe("withIndex + filter + order", () => {
    it("should compose queries with index, filter, and order", async () => {
      const t = setup()

      await createTestItem(t, {category: "tech", priority: 1})
      await createTestItem(t, {category: "tech", priority: 5})
      await createTestItem(t, {category: "tech", priority: 3})
      await createTestItem(t, {category: "food", priority: 10})

      const items = await t.query(api.functions.model.modelWithIndexFilterOrder, {
        category: "tech",
        minPriority: 2,
        order: "desc",
      })

      // Should filter to only items with priority >= 2 in category "tech"
      expect(items).toHaveLength(2)
      const priorities = items.map((item: {priority: number}) => item.priority)
      expect(priorities).toContain(5)
      expect(priorities).toContain(3)
    })

    test("modelWithIndexFilterOrder types", () => {
      expectTypeOfRegisteredQueryArgs(model.modelWithIndexFilterOrder).toEqualTypeOf<{
        category: string
        minPriority: number
        order: "asc" | "desc"
      }>()
      expectTypeOfRegisteredQueryReturns(model.modelWithIndexFilterOrder).toEqualTypeOf<
        Promise<Doc<"items">[]>
      >()
    })
  })

  describe("paginate", () => {
    it("should return paginated decoded documents", async () => {
      const t = setup()

      for (let i = 0; i < 5; i++) {
        await createTestItem(t, {name: `Item ${i}`})
      }

      const firstPage = await t.query(api.functions.model.modelPaginate, {
        paginationOpts: {numItems: 2, cursor: null},
      })

      expect(firstPage.page).toHaveLength(2)
      expect(firstPage.isDone).toBe(false)
      expect(firstPage.continueCursor).toBeDefined()

      const secondPage = await t.query(api.functions.model.modelPaginate, {
        paginationOpts: {numItems: 2, cursor: firstPage.continueCursor},
      })

      expect(secondPage.page).toHaveLength(2)
      const firstPageIds = firstPage.page.map((item: {_id: Id<"items">}) => item._id)
      const secondPageIds = secondPage.page.map((item: {_id: Id<"items">}) => item._id)
      expect(firstPageIds.some((id: Id<"items">) => secondPageIds.includes(id))).toBe(false)
    })

    test("modelPaginate types", () => {
      expectTypeOfRegisteredQueryArgs(model.modelPaginate).toEqualTypeOf<{
        paginationOpts: {numItems: number; cursor: string | null}
      }>()
      expectTypeOfRegisteredQueryReturns(model.modelPaginate).toEqualTypeOf<
        Promise<PaginationResult<Doc<"items">>>
      >()
    })
  })

  describe("stream collect", () => {
    it("should return decoded documents from stream", async () => {
      const t = setup()

      await createTestItem(t, {name: "Stream Item 1"})
      await createTestItem(t, {name: "Stream Item 2"})

      const items = await t.query(api.functions.model.modelStreamCollect, {})

      expect(items).toHaveLength(2)
    })

    test("modelStreamCollect types", () => {
      expectTypeOfRegisteredQueryArgs(model.modelStreamCollect).toEqualTypeOf<{}>()
      expectTypeOfRegisteredQueryReturns(model.modelStreamCollect).toEqualTypeOf<
        Promise<Doc<"items">[]>
      >()
    })
  })

  describe("stream withIndex", () => {
    it("should filter stream by index", async () => {
      const t = setup()

      await createTestItem(t, {category: "animals", name: "Cat"})
      await createTestItem(t, {category: "animals", name: "Dog"})
      await createTestItem(t, {category: "vehicles", name: "Car"})

      const animals = await t.query(api.functions.model.modelStreamWithIndex, {
        category: "animals",
      })

      expect(animals).toHaveLength(2)
      expect(animals.every((item: {category: string}) => item.category === "animals")).toBe(true)
    })

    test("modelStreamWithIndex types", () => {
      expectTypeOfRegisteredQueryArgs(model.modelStreamWithIndex).toEqualTypeOf<{
        category: string
      }>()
      expectTypeOfRegisteredQueryReturns(model.modelStreamWithIndex).toEqualTypeOf<
        Promise<Doc<"items">[]>
      >()
    })
  })

  describe("filterStreamWith", () => {
    it("should filter stream with predicate on decoded docs", async () => {
      const t = setup()

      await createTestItem(t, {name: "Low Value", value: 5})
      await createTestItem(t, {name: "High Value", value: 100})
      await createTestItem(t, {name: "Medium Value", value: 50})

      const highValueItems = await t.query(api.functions.model.modelFilterStreamWith, {
        minValue: 50,
      })

      expect(highValueItems).toHaveLength(2)
      expect(highValueItems.every((item: {value: number}) => item.value >= 50)).toBe(true)
    })

    test("modelFilterStreamWith types", () => {
      expectTypeOfRegisteredQueryArgs(model.modelFilterStreamWith).toEqualTypeOf<{
        minValue: number
      }>()
      expectTypeOfRegisteredQueryReturns(model.modelFilterStreamWith).toEqualTypeOf<
        Promise<Doc<"items">[]>
      >()
    })
  })

  describe("mapStream", () => {
    it("should transform decoded docs via mapStream", async () => {
      const t = setup()

      await createTestItem(t, {name: "Test Item", value: 10})

      const items = await t.query(api.functions.model.modelMapStream, {})

      expect(items).toHaveLength(1)
      expect(items[0]).toHaveProperty("id")
      expect(items[0]).toHaveProperty("name", "Test Item")
      expect(items[0]).toHaveProperty("doubled", 20)
    })

    test("modelMapStream types", () => {
      expectTypeOfRegisteredQueryArgs(model.modelMapStream).toEqualTypeOf<{}>()
      expectTypeOfRegisteredQueryReturns(model.modelMapStream).toEqualTypeOf<
        Promise<{id: GenericId<"items">; name: string; doubled: number}[]>
      >()
    })
  })

  describe("uniqueFromStream", () => {
    it("should return unique decoded document from stream", async () => {
      const t = setup()

      await createTestItem(t, {name: "Unique Stream Item", category: "unique-stream"})

      const item = await t.query(api.functions.model.modelUniqueFromStream, {
        category: "unique-stream",
      })

      expect(item).toBeDefined()
      expect(item?.category).toBe("unique-stream")
    })

    it("should throw DocNotUniqueError when multiple in stream", async () => {
      const t = setup()

      await createTestItem(t, {name: "Item 1", category: "duplicate-stream"})
      await createTestItem(t, {name: "Item 2", category: "duplicate-stream"})

      await expect(
        t.query(api.functions.model.modelUniqueFromStream, {category: "duplicate-stream"}),
      ).rejects.toThrow()
    })

    test("modelUniqueFromStream types", () => {
      expectTypeOfRegisteredQueryArgs(model.modelUniqueFromStream).toEqualTypeOf<{
        category: string
      }>()
      expectTypeOfRegisteredQueryReturns(model.modelUniqueFromStream).toEqualTypeOf<
        Promise<Doc<"items"> | null>
      >()
    })
  })

  describe("stream take", () => {
    it("should take n decoded documents from stream", async () => {
      const t = setup()

      await createTestItem(t, {name: "Item 1"})
      await createTestItem(t, {name: "Item 2"})
      await createTestItem(t, {name: "Item 3"})

      const items = await t.query(api.functions.model.modelStreamTake, {n: 2})

      expect(items).toHaveLength(2)
    })

    test("modelStreamTake types", () => {
      expectTypeOfRegisteredQueryArgs(model.modelStreamTake).toEqualTypeOf<{n: number}>()
      expectTypeOfRegisteredQueryReturns(model.modelStreamTake).toEqualTypeOf<
        Promise<Doc<"items">[]>
      >()
    })
  })

  describe("stream first", () => {
    it("should return first decoded document from stream", async () => {
      const t = setup()

      await createTestItem(t, {name: "First Stream Item"})
      await createTestItem(t, {name: "Second Stream Item"})

      const item = await t.query(api.functions.model.modelStreamFirst, {})

      expect(item).toBeDefined()
      expect(item?.name).toBe("First Stream Item")
    })

    it("should return null when stream is empty", async () => {
      const t = setup()

      const item = await t.query(api.functions.model.modelStreamFirst, {})

      expect(item).toBeNull()
    })

    test("modelStreamFirst types", () => {
      expectTypeOfRegisteredQueryArgs(model.modelStreamFirst).toEqualTypeOf<{}>()
      expectTypeOfRegisteredQueryReturns(model.modelStreamFirst).toEqualTypeOf<
        Promise<Doc<"items"> | null>
      >()
    })
  })

  describe("stream paginate", () => {
    it("should paginate decoded documents from stream", async () => {
      const t = setup()

      for (let i = 0; i < 5; i++) {
        await createTestItem(t, {name: `Stream Item ${i}`})
      }

      const firstPage = await t.query(api.functions.model.modelStreamPaginate, {
        paginationOpts: {numItems: 2, cursor: null},
      })

      expect(firstPage.page).toHaveLength(2)
      expect(firstPage.isDone).toBe(false)
      expect(firstPage.continueCursor).toBeDefined()
    })

    test("modelStreamPaginate types", () => {
      expectTypeOfRegisteredQueryArgs(model.modelStreamPaginate).toEqualTypeOf<{
        paginationOpts: {numItems: number; cursor: string | null}
      }>()
      expectTypeOfRegisteredQueryReturns(model.modelStreamPaginate).toEqualTypeOf<
        Promise<PaginationResult<Doc<"items">>>
      >()
    })
  })

  describe("Error Handling", () => {
    describe("catchTag on InvalidDocIdError", () => {
      it("should handle InvalidDocIdError with fallback", async () => {
        const t = setup()

        const result = await t.query(api.functions.model.modelNormalizeIdWithFallback, {
          idString: "invalid-id",
        })

        expect(result).toBe("fallback-for-invalid-id")
      })

      it("should return valid ID when ID is valid", async () => {
        const t = setup()
        const id = await createTestItem(t)

        const result = await t.query(api.functions.model.modelNormalizeIdWithFallback, {
          idString: id,
        })

        expect(result).toBe(id)
      })

      test("modelNormalizeIdWithFallback types", () => {
        expectTypeOfRegisteredQueryArgs(model.modelNormalizeIdWithFallback).toEqualTypeOf<{
          idString: string
        }>()
        expectTypeOfRegisteredQueryReturns(model.modelNormalizeIdWithFallback).toEqualTypeOf<
          Promise<GenericId<"items"> | string>
        >()
      })
    })

    describe("catchTag on DocNotFoundError", () => {
      it("should handle DocNotFoundError with fallback", async () => {
        const t = setup()
        const id = await createTestItem(t)
        await t.run(async (ctx) => {
          await ctx.db.delete(id)
        })

        const result = await t.query(api.functions.model.modelGetByIdWithFallback, {id})

        expect(result).toMatchObject({
          _id: id,
          name: "Fallback Item",
          category: "fallback",
        })
      })

      it("should return document when found", async () => {
        const t = setup()
        const id = await createTestItem(t, {name: "Real Item"})

        const result = await t.query(api.functions.model.modelGetByIdWithFallback, {id})

        expect(result).toMatchObject({
          _id: id,
          name: "Real Item",
        })
      })

      test("modelGetByIdWithFallback types", () => {
        expectTypeOfRegisteredQueryArgs(model.modelGetByIdWithFallback).toEqualTypeOf<{
          id: GenericId<"items">
        }>()
        expectTypeOfRegisteredQueryReturns(model.modelGetByIdWithFallback).toEqualTypeOf<
          Promise<Doc<"items">>
        >()
      })
    })
  })

  describe("Model Stream Transformations", () => {
    describe("chained transformations", () => {
      it("should apply multiple sequential maps", async () => {
        const t = setup()

        await createTestItem(t, {name: "test", value: 10})
        await createTestItem(t, {name: "item", value: 20})

        const items = await t.query(api.functions.model.modelStreamChainedMaps, {})

        expect(items).toHaveLength(2)
        expect(items[0]).toHaveProperty("name")
        expect(items[0]).toHaveProperty("value")
        expect(items[0]).toHaveProperty("label")
        expect(items[0]!.name).toBe("TEST")
        expect(items[0]!.label).toBe("Item: TEST")
      })

      test("modelStreamChainedMaps types", () => {
        expectTypeOfRegisteredQueryArgs(model.modelStreamChainedMaps).toEqualTypeOf<{}>()
        expectTypeOfRegisteredQueryReturns(model.modelStreamChainedMaps).toEqualTypeOf<
          Promise<{name: string; value: number; label: string}[]>
        >()
      })

      it("should apply map -> filter -> map pipeline", async () => {
        const t = setup()

        await createTestItem(t, {name: "Low", value: 5})
        await createTestItem(t, {name: "High", value: 50})

        const items = await t.query(api.functions.model.modelStreamMapFilterMap, {
          minValue: 50,
        })

        expect(items).toHaveLength(1)
        expect(items[0]!.doubled).toBe(100)
        expect(items[0]!.label).toBe("[100] High")
      })

      test("modelStreamMapFilterMap types", () => {
        expectTypeOfRegisteredQueryArgs(model.modelStreamMapFilterMap).toEqualTypeOf<{
          minValue: number
        }>()
        expectTypeOfRegisteredQueryReturns(model.modelStreamMapFilterMap).toEqualTypeOf<
          Promise<{id: GenericId<"items">; doubled: number; name: string; label: string}[]>
        >()
      })
    })

    describe("error propagation", () => {
      it("should propagate error from map transformation", async () => {
        const t = setup()

        await createTestItem(t, {name: "Good Item", value: 10})
        await createTestItem(t, {name: "Bad Item", value: 20})

        await expect(
          t.query(api.functions.model.modelStreamMapWithError, {failOnName: "Bad Item"}),
        ).rejects.toThrow()
      })

      test("modelStreamMapWithError types", () => {
        expectTypeOfRegisteredQueryArgs(model.modelStreamMapWithError).toEqualTypeOf<{
          failOnName: string
        }>()
      })

      it("should propagate error from middle of chain", async () => {
        const t = setup()

        await createTestItem(t, {name: "Item A", value: 10})
        await createTestItem(t, {name: "Item B", value: 42})

        await expect(
          t.query(api.functions.model.modelStreamChainedMapWithMiddleError, {failOnValue: 42}),
        ).rejects.toThrow()
      })

      test("modelStreamChainedMapWithMiddleError types", () => {
        expectTypeOfRegisteredQueryArgs(model.modelStreamChainedMapWithMiddleError).toEqualTypeOf<{
          failOnValue: number
        }>()
      })

      it("should allow error recovery with catchTag", async () => {
        const t = setup()

        await createTestItem(t, {name: "Good Item", value: 10})
        await createTestItem(t, {name: "Bad Item", value: 20})

        const items = await t.query(api.functions.model.modelStreamMapWithRecovery, {
          failOnName: "Bad Item",
        })

        expect(items).toHaveLength(2)
        const recoveredItem = items.find((item: {recovered: boolean}) => item.recovered === true)
        expect(recoveredItem).toBeDefined()
        expect(recoveredItem!.name).toBe("RECOVERED: Bad Item")
      })

      test("modelStreamMapWithRecovery types", () => {
        expectTypeOfRegisteredQueryArgs(model.modelStreamMapWithRecovery).toEqualTypeOf<{
          failOnName: string
        }>()
        expectTypeOfRegisteredQueryReturns(model.modelStreamMapWithRecovery).toEqualTypeOf<
          Promise<{id: GenericId<"items">; name: string; recovered: boolean}[]>
        >()
      })
    })

    describe("Effect-based maps with DB lookups", () => {
      it("should perform DB get in map", async () => {
        const t = setup()

        const itemId = await createTestItem(t, {name: "Parent Item"})
        await createTestDetail(t, itemId, "Detail Info")

        const results = await t.query(api.functions.model.modelStreamMapWithDbGet, {})

        expect(results).toHaveLength(1)
        expect(results[0]!.detailInfo).toBe("Detail Info")
        expect(results[0]!.itemName).toBe("Parent Item")
      })

      test("modelStreamMapWithDbGet types", () => {
        expectTypeOfRegisteredQueryArgs(model.modelStreamMapWithDbGet).toEqualTypeOf<{}>()
        expectTypeOfRegisteredQueryReturns(model.modelStreamMapWithDbGet).toEqualTypeOf<
          Promise<{detailInfo: string; itemName: string}[]>
        >()
      })

      it("should perform nested DB query in map", async () => {
        const t = setup()

        const item1Id = await createTestItem(t, {name: "Item with details"})
        await createTestDetail(t, item1Id, "Detail 1")
        await createTestDetail(t, item1Id, "Detail 2")
        await createTestItem(t, {name: "Item without details"})

        const results = await t.query(api.functions.model.modelStreamMapWithDbQuery, {})

        expect(results).toHaveLength(2)
        const itemWithDetails = results.find(
          (item: {name: string}) => item.name === "Item with details",
        )
        const itemWithoutDetails = results.find(
          (item: {name: string}) => item.name === "Item without details",
        )
        expect(itemWithDetails!.detailCount).toBe(2)
        expect(itemWithoutDetails!.detailCount).toBe(0)
      })

      test("modelStreamMapWithDbQuery types", () => {
        expectTypeOfRegisteredQueryArgs(model.modelStreamMapWithDbQuery).toEqualTypeOf<{}>()
        expectTypeOfRegisteredQueryReturns(model.modelStreamMapWithDbQuery).toEqualTypeOf<
          Promise<{id: GenericId<"items">; name: string; detailCount: number}[]>
        >()
      })
    })

    describe("edge cases", () => {
      it("should filter out null mapped items", async () => {
        const t = setup()

        await createTestItem(t, {name: "Keep", category: "wanted"})
        await createTestItem(t, {name: "Skip 1", category: "other"})
        await createTestItem(t, {name: "Skip 2", category: "another"})

        const items = await t.query(api.functions.model.modelStreamMapSomeToNull, {
          keepCategory: "wanted",
        })

        expect(items).toHaveLength(1)
        expect(items[0]!.name).toBe("Keep")
      })

      test("modelStreamMapSomeToNull types", () => {
        expectTypeOfRegisteredQueryArgs(model.modelStreamMapSomeToNull).toEqualTypeOf<{
          keepCategory: string
        }>()
      })

      it("should handle empty stream through transformations", async () => {
        const t = setup()

        const items = await t.query(api.functions.model.modelStreamChainedMaps, {})

        expect(items).toEqual([])
      })
    })
  })
})
