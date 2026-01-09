import type {
  DataModelFromSchemaDefinition,
  DocumentByName,
  NamedTableInfo,
  SystemTableNames,
  TableNamesInDataModel,
} from "convex/server"
import type {GenericId} from "convex/values"
import type {Effect as E} from "effect"
import type {QueryInitializer} from "./query"

import {describe, expectTypeOf, test, vi} from "@effect/vitest"
import {defineSchema, defineTable} from "convex/server"
import {v} from "convex/values"

import {
  mockGenericDatabaseReader,
  mockGenericDatabaseWriter,
  mockGenericId,
  mockQueryInitializer,
} from "src/test/mock"

const _schema = defineSchema({
  user: defineTable({
    name: v.string(),
  }),
})

type DataModel = DataModelFromSchemaDefinition<typeof _schema>
type TableNames = TableNamesInDataModel<DataModel>
type TableInfo<TableName extends TableNames> = NamedTableInfo<DataModel, TableName>
type Id<TableName extends TableNames | SystemTableNames> = GenericId<TableName>
type Doc<TableName extends TableNames> = DocumentByName<DataModel, TableName>

describe("GenericDatabaseReader", () => {
  describe("get", () => {
    test("should have correct type signature", () => {
      const db = mockGenericDatabaseReader<DataModel>()
      const actual = db.get(mockGenericId("user", "user-id"))

      expectTypeOf(actual).toEqualTypeOf<E.Effect<Doc<"user"> | null, never, never>>()
    })
  })

  describe("query", () => {
    test("should have correct type signature", () => {
      const db = mockGenericDatabaseReader<DataModel>({
        query: vi.fn().mockReturnValue(mockQueryInitializer<TableInfo<"user">>()),
      })
      const actual = db.query("user")

      expectTypeOf(actual).toEqualTypeOf<QueryInitializer<TableInfo<"user">>>()
    })
  })

  describe("normalizeId", () => {
    test("should have correct type signature", () => {
      const db = mockGenericDatabaseWriter<DataModel>({
        insert: vi.fn().mockResolvedValue(mockGenericId("user", "new-user-id")),
      })
      const actual = db.normalizeId("user", "user-id")

      expectTypeOf(actual).toEqualTypeOf<E.Effect<GenericId<"user"> | null>>()
    })
  })
})

describe("GenericDatabaseWriter", () => {
  describe("insert", () => {
    test("should have correct type signature", () => {
      const db = mockGenericDatabaseWriter<DataModel>({
        insert: vi.fn().mockResolvedValue(mockGenericId("user", "new-user-id")),
      })
      const actual = db.insert("user", {name: "Joe"})

      expectTypeOf(actual).toEqualTypeOf<E.Effect<Id<"user">>>()
    })
  })

  describe("patch", () => {
    test("should have correct type signature", () => {
      const db = mockGenericDatabaseWriter<DataModel>({
        patch: vi.fn().mockResolvedValue(undefined),
      })
      const actual = db.patch(mockGenericId("user", "user-id"), {name: "Joe"})

      expectTypeOf(actual).toEqualTypeOf<E.Effect<void>>()
    })
  })

  describe("replace", () => {
    test("should have correct type signature", () => {
      const db = mockGenericDatabaseWriter<DataModel>({
        replace: vi.fn().mockResolvedValue(undefined),
      })
      const actual = db.replace(mockGenericId("user", "user-id"), {name: "Joe"})

      expectTypeOf(actual).toEqualTypeOf<E.Effect<void>>()
    })
  })

  describe("delete", () => {
    test("should have correct type signature", () => {
      const db = mockGenericDatabaseWriter<DataModel>({
        delete: vi.fn().mockResolvedValue(undefined),
      })
      const actual = db.delete(mockGenericId("user", "user-id"))

      expectTypeOf(actual).toEqualTypeOf<E.Effect<void>>()
    })
  })

  describe("extends GenericDatabaseReader", () => {
    describe("get", () => {
      test("should have correct type signature", () => {
        const db = mockGenericDatabaseWriter<DataModel>()
        const actual = db.get(mockGenericId("user", "user-id"))

        expectTypeOf(actual).toEqualTypeOf<E.Effect<Doc<"user"> | null, never, never>>()
      })
    })

    describe("query", () => {
      test("should have correct type signature", () => {
        const db = mockGenericDatabaseWriter<DataModel>({
          query: vi.fn().mockReturnValue(mockQueryInitializer<TableInfo<"user">>()),
        })
        const actual = db.query("user")

        expectTypeOf(actual).toEqualTypeOf<QueryInitializer<TableInfo<"user">>>()
      })
    })

    describe("normalizeId", () => {
      test("should have correct type signature", () => {
        const db = mockGenericDatabaseWriter<DataModel>({
          insert: vi.fn().mockResolvedValue(mockGenericId("user", "new-user-id")),
        })
        const actual = db.normalizeId("user", "user-id")

        expectTypeOf(actual).toEqualTypeOf<E.Effect<GenericId<"user"> | null, never>>()
      })
    })
  })
})
