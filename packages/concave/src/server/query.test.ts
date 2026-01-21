import type {
  PaginationResult as ConvexPaginationResult,
  DataModelFromSchemaDefinition,
  DocumentByName,
  NamedTableInfo,
  TableNamesInDataModel,
} from "convex/server"
import type {OrderedQuery, Query} from "./query"

import {describe, expect, expectTypeOf, it, test, vi} from "@effect/vitest"
import {defineSchema, defineTable} from "convex/server"
import {v} from "convex/values"
import {Effect as E} from "effect"

import {mockGenericId, mockOrderedQuery, mockQuery, mockQueryInitializer} from "../testing"
import {DocNotUniqueError} from "./error"

const _schema = defineSchema({
  user: defineTable({
    name: v.string(),
    age: v.number(),
  })
    .index("by_age", ["age"])
    .searchIndex("by_name", {searchField: "name"}),
})

type DataModel = DataModelFromSchemaDefinition<typeof _schema>
type TableNames = TableNamesInDataModel<DataModel>
type TableInfo<TableName extends TableNames> = NamedTableInfo<DataModel, TableName>
type Doc<TableName extends TableNames> = DocumentByName<DataModel, TableName>

describe("OrderedQuery", () => {
  describe("filter", () => {
    test("should have correct type signature", () => {
      const orderedQuery = mockOrderedQuery<TableInfo<"user">>()
      const actual = orderedQuery.filter((q) => q.gt(q.field("age"), 18))

      expectTypeOf(actual).toEqualTypeOf<OrderedQuery<TableInfo<"user">>>()
    })
  })

  describe("paginate", () => {
    test("should have correct type signature", () => {
      const orderedQuery = mockOrderedQuery<TableInfo<"user">>()
      const actual = orderedQuery.paginate({cursor: null, numItems: 10})

      expectTypeOf(actual).toEqualTypeOf<
        E.Effect<ConvexPaginationResult<Doc<"user">>, never, never>
      >()
    })
  })

  describe("collect", () => {
    test("should have correct type signature", () => {
      const orderedQuery = mockOrderedQuery<TableInfo<"user">>()
      const actual = orderedQuery.collect()

      expectTypeOf(actual).toEqualTypeOf<E.Effect<Doc<"user">[]>>()
    })
  })

  describe("take", () => {
    test("should have correct type signature", () => {
      const orderedQuery = mockOrderedQuery<TableInfo<"user">>()
      const actual = orderedQuery.take(5)

      expectTypeOf(actual).toEqualTypeOf<E.Effect<Doc<"user">[]>>()
    })
  })

  describe("first", () => {
    test("should have correct type signature", () => {
      const orderedQuery = mockOrderedQuery<TableInfo<"user">>()
      const actual = orderedQuery.first()

      expectTypeOf(actual).toEqualTypeOf<E.Effect<Doc<"user"> | null, never, never>>()
    })
  })

  describe("unique", () => {
    test("should have correct type signature", () => {
      const orderedQuery = mockOrderedQuery<TableInfo<"user">>()
      const actual = orderedQuery.unique()

      expectTypeOf(actual).toEqualTypeOf<E.Effect<Doc<"user"> | null, DocNotUniqueError, never>>()
    })

    it.effect("should return Doc for single document", () =>
      E.gen(function* () {
        const doc: Doc<"user"> = {
          _id: mockGenericId("user", "user-1"),
          _creationTime: Date.now(),
          name: "John",
          age: 22,
        }

        const orderedQuery = mockOrderedQuery<TableInfo<"user">>({
          take: vi.fn().mockResolvedValue([doc]),
        })

        const actual = yield* orderedQuery.unique()

        expectTypeOf(actual).toEqualTypeOf<Doc<"user"> | null>()
        expect(actual).toEqual(doc)
      }),
    )

    it.effect("should return null for no documents", () =>
      E.gen(function* () {
        const orderedQuery = mockOrderedQuery<TableInfo<"user">>({
          take: vi.fn().mockResolvedValue([]),
        })

        const actual = yield* orderedQuery.unique()

        expectTypeOf(actual).toEqualTypeOf<Doc<"user"> | null>()
        expect(actual).toEqual(null)
      }),
    )

    it.effect("should fail with DocNotUniqueError for multiple documents", () =>
      E.gen(function* () {
        const docs: Doc<"user">[] = [
          {
            _id: mockGenericId("user", "user-1"),
            _creationTime: Date.now(),
            name: "John",
            age: 22,
          },
          {
            _id: mockGenericId("user", "user-2"),
            _creationTime: Date.now(),
            name: "Jane",
            age: 28,
          },
        ]

        const orderedQuery = mockOrderedQuery<TableInfo<"user">>({
          take: vi.fn().mockResolvedValue(docs),
        })

        const actual = yield* orderedQuery.unique().pipe(E.flip)

        expect(actual).toBeInstanceOf(DocNotUniqueError)
      }),
    )
  })
})

describe("Query", () => {
  describe("order", () => {
    test("should have correct type signature", () => {
      const query = mockQuery<TableInfo<"user">>()

      expectTypeOf(query.order("asc")).toEqualTypeOf<OrderedQuery<TableInfo<"user">>>()
      expectTypeOf(query.order("desc")).toEqualTypeOf<OrderedQuery<TableInfo<"user">>>()
    })
  })

  describe("extends OrderedQuery", () => {
    describe("override filter", () => {
      test("should have correct type signature returning Query", () => {
        const query = mockQuery<TableInfo<"user">>()
        const actual = query.filter((q) => q.gt(q.field("age"), 18))

        expectTypeOf(actual).toEqualTypeOf<Query<TableInfo<"user">>>()
      })
    })

    describe("paginate", () => {
      test("should have correct type signature", () => {
        const orderedQuery = mockQuery<TableInfo<"user">>()
        const actual = orderedQuery.paginate({cursor: null, numItems: 10})

        expectTypeOf(actual).toEqualTypeOf<
          E.Effect<ConvexPaginationResult<Doc<"user">>, never, never>
        >()
      })
    })

    describe("collect", () => {
      test("should have correct type signature", () => {
        const orderedQuery = mockQuery<TableInfo<"user">>()
        const actual = orderedQuery.collect()

        expectTypeOf(actual).toEqualTypeOf<E.Effect<Doc<"user">[]>>()
      })
    })

    describe("take", () => {
      test("should have correct type signature", () => {
        const orderedQuery = mockQuery<TableInfo<"user">>()
        const actual = orderedQuery.take(5)

        expectTypeOf(actual).toEqualTypeOf<E.Effect<Doc<"user">[]>>()
      })
    })

    describe("first", () => {
      test("should have correct type signature", () => {
        const orderedQuery = mockQuery<TableInfo<"user">>()
        const actual = orderedQuery.first()

        expectTypeOf(actual).toEqualTypeOf<E.Effect<Doc<"user"> | null, never, never>>()
      })
    })

    describe("unique", () => {
      test("should have correct type signature", () => {
        const orderedQuery = mockQuery<TableInfo<"user">>()
        const actual = orderedQuery.unique()

        expectTypeOf(actual).toEqualTypeOf<E.Effect<Doc<"user"> | null, DocNotUniqueError, never>>()
      })
    })
  })
})

describe("QueryInitializer", () => {
  describe("fullTableScan", () => {
    test("should have correct type signature", () => {
      const queryInitializer = mockQueryInitializer<TableInfo<"user">>()
      const actual = queryInitializer.fullTableScan()

      expectTypeOf(actual).toEqualTypeOf<Query<TableInfo<"user">>>()
    })
  })

  describe("withIndex", () => {
    test("should have correct type signature", () => {
      const queryInitializer = mockQueryInitializer<TableInfo<"user">>()

      expectTypeOf(queryInitializer.withIndex("by_id")).toEqualTypeOf<Query<TableInfo<"user">>>()

      expectTypeOf(
        queryInitializer.withIndex("by_id", (q) => q.eq("_id", mockGenericId("user", "user-id"))),
      ).toEqualTypeOf<Query<TableInfo<"user">>>()

      expectTypeOf(queryInitializer.withIndex("by_age")).toEqualTypeOf<Query<TableInfo<"user">>>()

      expectTypeOf(queryInitializer.withIndex("by_age", (q) => q.gt("age", 18))).toEqualTypeOf<
        Query<TableInfo<"user">>
      >()
    })
  })

  describe("withSearchIndex", () => {
    test("should have correct type signature", () => {
      const queryInitializer = mockQueryInitializer<TableInfo<"user">>()
      const actual = queryInitializer.withSearchIndex("by_name", (q) => q.search("name", "joe"))

      expectTypeOf(actual).toEqualTypeOf<OrderedQuery<TableInfo<"user">>>()
    })
  })

  describe("extends Query", () => {
    describe("order", () => {
      test("should have correct type signature", () => {
        const query = mockQueryInitializer<TableInfo<"user">>()

        expectTypeOf(query.order("asc")).toEqualTypeOf<OrderedQuery<TableInfo<"user">>>()
        expectTypeOf(query.order("desc")).toEqualTypeOf<OrderedQuery<TableInfo<"user">>>()
      })
    })

    describe("filter", () => {
      test("should have correct type signature returning Query", () => {
        const query = mockQueryInitializer<TableInfo<"user">>()
        const actual = query.filter((q) => q.gt(q.field("age"), 18))

        expectTypeOf(actual).toEqualTypeOf<Query<TableInfo<"user">>>()
      })
    })

    describe("paginate", () => {
      test("should have correct type signature", () => {
        const orderedQuery = mockQueryInitializer<TableInfo<"user">>()
        const actual = orderedQuery.paginate({cursor: null, numItems: 10})

        expectTypeOf(actual).toEqualTypeOf<
          E.Effect<ConvexPaginationResult<Doc<"user">>, never, never>
        >()
      })
    })

    describe("collect", () => {
      test("should have correct type signature", () => {
        const orderedQuery = mockQueryInitializer<TableInfo<"user">>()
        const actual = orderedQuery.collect()

        expectTypeOf(actual).toEqualTypeOf<E.Effect<Doc<"user">[]>>()
      })
    })

    describe("take", () => {
      test("should have correct type signature", () => {
        const orderedQuery = mockQueryInitializer<TableInfo<"user">>()
        const actual = orderedQuery.take(5)

        expectTypeOf(actual).toEqualTypeOf<E.Effect<Doc<"user">[]>>()
      })
    })

    describe("first", () => {
      test("should have correct type signature", () => {
        const orderedQuery = mockQueryInitializer<TableInfo<"user">>()
        const actual = orderedQuery.first()

        expectTypeOf(actual).toEqualTypeOf<E.Effect<Doc<"user"> | null, never, never>>()
      })
    })

    describe("unique", () => {
      test("should have correct type signature", () => {
        const orderedQuery = mockQueryInitializer<TableInfo<"user">>()
        const actual = orderedQuery.unique()

        expectTypeOf(actual).toEqualTypeOf<E.Effect<Doc<"user"> | null, DocNotUniqueError, never>>()
      })
    })
  })
})
