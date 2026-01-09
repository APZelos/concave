import type {
  DataModelFromSchemaDefinition,
  DocumentByName,
  TableNamesInDataModel,
} from "convex/server"
import type {GenericId} from "convex/values"
import type {Effect as E} from "effect"
import type {Auth} from "./auth"
import type {GenericDatabaseReader, GenericDatabaseWriter} from "./database"
import type {Scheduler} from "./scheduler"
import type {StorageActionWriter, StorageReader, StorageWriter} from "./storage"

import {describe, expect, expectTypeOf, test} from "@effect/vitest"
import {defineSchema, defineTable} from "convex/server"
import {v} from "convex/values"

import {
  mockFunctionReference,
  mockGenericActionCtx,
  mockGenericMutationCtx,
  mockGenericQueryCtx,
} from "src/test/mock"
import {createActionCtx, createMutationCtx, createQueryCtx, HttpActionCtx} from "./context"

const _schema = defineSchema({
  user: defineTable({
    name: v.string(),
  }).vectorIndex("by_name", {vectorField: "name", dimensions: 2}),
})

type DataModel = DataModelFromSchemaDefinition<typeof _schema>
type TableNames = TableNamesInDataModel<DataModel>
type Doc<TableName extends TableNames> = DocumentByName<DataModel, TableName>

describe("GenericQueryCtx", () => {
  describe("properties", () => {
    test("should initialize all services correctly", () => {
      const queryCtx = mockGenericQueryCtx<DataModel>()

      expectTypeOf(queryCtx.auth).toEqualTypeOf<Auth>()
      expectTypeOf(queryCtx.db).toEqualTypeOf<GenericDatabaseReader<DataModel>>()
      expectTypeOf(queryCtx.storage).toEqualTypeOf<StorageReader>()
      expect(queryCtx.auth).toBeDefined()
      expect(queryCtx.db).toBeDefined()
      expect(queryCtx.storage).toBeDefined()
    })

    test("should store convex query context", () => {
      const queryCtx = mockGenericQueryCtx<DataModel>()

      expect(queryCtx.convexQueryCtx).toBeDefined()
    })
  })

  describe("runQuery", () => {
    test("should have correct type signature", () => {
      const queryCtx = mockGenericQueryCtx<DataModel>()
      const query = mockFunctionReference<"query", "public", {id: string}, Doc<"user">>()

      expectTypeOf(queryCtx.runQuery(query, {id: "user-id"})).toEqualTypeOf<E.Effect<Doc<"user">>>()
    })
  })
})

describe("GenericMutationCtx", () => {
  describe("properties", () => {
    test("should initialize all services correctly", () => {
      const mutationCtx = mockGenericMutationCtx<DataModel>()

      expectTypeOf(mutationCtx.auth).toEqualTypeOf<Auth>()
      expectTypeOf(mutationCtx.db).toEqualTypeOf<GenericDatabaseWriter<DataModel>>()
      expectTypeOf(mutationCtx.storage).toEqualTypeOf<StorageWriter>()
      expectTypeOf(mutationCtx.scheduler).toEqualTypeOf<Scheduler>()
      expect(mutationCtx.auth).toBeDefined()
      expect(mutationCtx.db).toBeDefined()
      expect(mutationCtx.storage).toBeDefined()
      expect(mutationCtx.scheduler).toBeDefined()
    })

    test("should store convex mutation context", () => {
      const mutationCtx = mockGenericMutationCtx<DataModel>()

      expect(mutationCtx.convexMutationCtx).toBeDefined()
    })
  })

  describe("runQuery", () => {
    test("should have correct type signature", () => {
      const mutationCtx = mockGenericMutationCtx<DataModel>()
      const query = mockFunctionReference<"query", "public", {id: string}, Doc<"user">>()

      expectTypeOf(mutationCtx.runQuery(query, {id: "user-id"})).toEqualTypeOf<
        E.Effect<Doc<"user">>
      >()
    })
  })

  describe("runMutation", () => {
    test("should have correct type signature", () => {
      const mutationCtx = mockGenericMutationCtx<DataModel>()
      const mutation = mockFunctionReference<
        "mutation",
        "public",
        {name: string},
        GenericId<"user">
      >()

      expectTypeOf(mutationCtx.runMutation(mutation, {name: "Test User"})).toEqualTypeOf<
        E.Effect<GenericId<"user">>
      >()
    })
  })
})

describe("GenericActionCtx", () => {
  describe("runQuery", () => {
    test("should have correct type signature", () => {
      const actionCtx = mockGenericActionCtx<DataModel>()
      const query = mockFunctionReference<"query", "public", {id: string}, Doc<"user">>()

      expectTypeOf(actionCtx.runQuery(query, {id: "user-id"})).toEqualTypeOf<
        E.Effect<Doc<"user">>
      >()
    })
  })

  describe("runMutation", () => {
    test("should have correct type signature", () => {
      const actionCtx = mockGenericActionCtx<DataModel>()
      const mutation = mockFunctionReference<
        "mutation",
        "public",
        {name: string},
        GenericId<"user">
      >()

      expectTypeOf(actionCtx.runMutation(mutation, {name: "Test User"})).toEqualTypeOf<
        E.Effect<GenericId<"user">>
      >()
    })
  })

  describe("runAction", () => {
    test("should have correct type signature", () => {
      const actionCtx = mockGenericActionCtx<DataModel>()
      const action = mockFunctionReference<"action", "public", {data: string}, void>()

      expectTypeOf(actionCtx.runAction(action, {data: "test"})).toEqualTypeOf<E.Effect<void>>()
    })
  })

  describe("vectorSearch", () => {
    test("should have correct type signature", () => {
      const actionCtx = mockGenericActionCtx<DataModel>()
      const actual = actionCtx.vectorSearch("user", "by_name", {
        vector: [1, 2],
        limit: 10,
      })

      expectTypeOf(actual).toEqualTypeOf<
        E.Effect<{_id: GenericId<"user">; _score: number}[], never, never>
      >()
    })
  })

  describe("properties", () => {
    test("should initialize all services correctly", () => {
      const actionCtx = mockGenericActionCtx<DataModel>()

      expectTypeOf(actionCtx.auth).toEqualTypeOf<Auth>()
      expectTypeOf(actionCtx.storage).toEqualTypeOf<StorageActionWriter>()
      expectTypeOf(actionCtx.scheduler).toEqualTypeOf<Scheduler>()
      expect(actionCtx.auth).toBeDefined()
      expect(actionCtx.storage).toBeDefined()
      expect(actionCtx.scheduler).toBeDefined()
    })

    test("should store convex action context", () => {
      const actionCtx = mockGenericActionCtx<DataModel>()

      expect(actionCtx.convexActionCtx).toBeDefined()
    })
  })
})

describe("createQueryCtx", () => {
  test("should return a Context tag", () => {
    const QueryCtx = createQueryCtx<DataModel>()

    expect(QueryCtx).toBeDefined()
    expect(typeof QueryCtx).toBe("object")
    expect(QueryCtx.key).toBe("QueryCtx")
  })
})

describe("createMutationCtx", () => {
  test("should return a Context tag", () => {
    const MutationCtx = createMutationCtx<DataModel>()

    expect(MutationCtx).toBeDefined()
    expect(typeof MutationCtx).toBe("object")
    expect(MutationCtx.key).toBe("MutationCtx")
  })
})

describe("createActionCtx", () => {
  test("should return a Context tag", () => {
    const ActionCtx = createActionCtx<DataModel>()

    expect(ActionCtx).toBeDefined()
    expect(typeof ActionCtx).toBe("object")
    expect(ActionCtx.key).toBe("ActionCtx")
  })
})

describe("HttpActionCtx", () => {
  test("should be a pre-configured Context tag", () => {
    expect(HttpActionCtx).toBeDefined()
    expect(typeof HttpActionCtx).toBe("object")
    expect(HttpActionCtx.key).toBe("HttpActionCtx")
  })
})
