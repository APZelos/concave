import type {
  PaginationResult as ConvexPaginationResult,
  DataModelFromSchemaDefinition,
  DocumentByName,
  TableNamesInDataModel,
} from "convex/server"

import {describe, expect, expectTypeOf, it, test, vi} from "@effect/vitest"
import {defineSchema, defineTable} from "convex/server"
import {v} from "convex/values"
import {Effect as E, Option} from "effect"

import {
  mockConvexQueryStream,
  mockConvexStreamDatabaseReader,
  mockConvexStreamQuery,
  mockConvexStreamQueryInitializer,
  mockGenericId,
  mockGenericQueryCtx,
} from "src/test/mock"
import {createQueryCtx, DocNotUniqueError} from "../../server"
import {
  firstFromStream,
  mergedStream,
  paginateStream,
  QueryStream,
  stream,
  StreamDatabaseReader,
  StreamQuery,
  StreamQueryInitializer,
  takeFromStream,
  uniqueFromStream,
} from "./stream"

const _schema = defineSchema({
  user: defineTable({
    name: v.string(),
    age: v.number(),
  }).index("by_name", ["name"]),
})

type Schema = typeof _schema
type DataModel = DataModelFromSchemaDefinition<Schema>
type TableNames = TableNamesInDataModel<DataModel>
type Doc<TableName extends TableNames> = DocumentByName<DataModel, TableName>

const QueryCtx = createQueryCtx<DataModel>()

describe("QueryStream", () => {
  describe("filterWith", () => {
    test("should have correct type signature", () => {
      const queryCtx = mockGenericQueryCtx<DataModel>()
      const convexStream = mockConvexQueryStream<Doc<"user">>()
      const queryStream = new QueryStream(QueryCtx, queryCtx, convexStream)

      const actual = queryStream.filterWith(() => E.succeed(true))

      expectTypeOf(actual).toEqualTypeOf<QueryStream<DataModel, Doc<"user">, never>>()
    })
  })

  describe("map", () => {
    test("should have correct type signature", () => {
      const queryCtx = mockGenericQueryCtx<DataModel>()
      const convexStream = mockConvexQueryStream<Doc<"user">>()
      const queryStream = new QueryStream(QueryCtx, queryCtx, convexStream)

      const actual = queryStream.map((doc) => E.succeed({id: doc._id}))

      expectTypeOf(actual).toHaveProperty("map")
      expectTypeOf(actual).toHaveProperty("collect")
    })
  })

  describe("flatMap", () => {
    test("should have correct type signature", () => {
      const queryCtx = mockGenericQueryCtx<DataModel>()
      const convexStream = mockConvexQueryStream<Doc<"user">>()
      const queryStream = new QueryStream(QueryCtx, queryCtx, convexStream)

      const actual = queryStream.flatMap(
        () =>
          E.succeed(new QueryStream(QueryCtx, queryCtx, mockConvexQueryStream<{nested: string}>())),
        ["nested"],
      )

      expectTypeOf(actual).toEqualTypeOf<QueryStream<DataModel, {nested: string}, never>>()
    })
  })

  describe("distinct", () => {
    test("should have correct type signature", () => {
      const queryCtx = mockGenericQueryCtx<DataModel>()
      const convexStream = mockConvexQueryStream<Doc<"user">>()
      const queryStream = new QueryStream(QueryCtx, queryCtx, convexStream)

      const actual = queryStream.distinct(["name"])

      expectTypeOf(actual).toEqualTypeOf<QueryStream<DataModel, Doc<"user">, never>>()
    })
  })

  describe("paginate", () => {
    test("should have correct type signature", () => {
      const queryCtx = mockGenericQueryCtx<DataModel>()
      const convexStream = mockConvexQueryStream<Doc<"user">>()
      const queryStream = new QueryStream(QueryCtx, queryCtx, convexStream)

      const actual = queryStream.paginate({cursor: null, numItems: 10})

      expectTypeOf(actual).toEqualTypeOf<E.Effect<ConvexPaginationResult<Doc<"user">>, never>>()
    })
  })

  describe("collect", () => {
    test("should have correct type signature", () => {
      const queryCtx = mockGenericQueryCtx<DataModel>()
      const convexStream = mockConvexQueryStream<Doc<"user">>()
      const queryStream = new QueryStream(QueryCtx, queryCtx, convexStream)

      const actual = queryStream.collect()

      expectTypeOf(actual).toEqualTypeOf<E.Effect<Doc<"user">[], never>>()
    })
  })

  describe("take", () => {
    test("should have correct type signature", () => {
      const queryCtx = mockGenericQueryCtx<DataModel>()
      const convexStream = mockConvexQueryStream<Doc<"user">>()
      const queryStream = new QueryStream(QueryCtx, queryCtx, convexStream)

      const actual = queryStream.take(5)

      expectTypeOf(actual).toEqualTypeOf<E.Effect<Doc<"user">[], never>>()
    })
  })

  describe("first", () => {
    test("should have correct type signature", () => {
      const queryCtx = mockGenericQueryCtx<DataModel>()
      const convexStream = mockConvexQueryStream<Doc<"user">>()
      const queryStream = new QueryStream(QueryCtx, queryCtx, convexStream)

      const actual = queryStream.first()

      expectTypeOf(actual).toEqualTypeOf<E.Effect<Doc<"user"> | null, never>>()
    })
  })

  describe("unique", () => {
    test("should have correct type signature", () => {
      const queryCtx = mockGenericQueryCtx<DataModel>()
      const convexStream = mockConvexQueryStream<Doc<"user">>()
      const queryStream = new QueryStream(QueryCtx, queryCtx, convexStream)

      const actual = queryStream.unique()

      expectTypeOf(actual).toEqualTypeOf<E.Effect<Doc<"user"> | null, DocNotUniqueError, never>>()
    })

    it.effect("should return document for single result", () =>
      E.gen(function* () {
        const doc: Doc<"user"> = {
          _id: mockGenericId("user", "user-1"),
          _creationTime: Date.now(),
          name: "John",
          age: 22,
        }

        const queryCtx = mockGenericQueryCtx<DataModel>()
        const convexStream = mockConvexQueryStream<Doc<"user">>({
          take: vi.fn().mockResolvedValue([doc]),
        })
        const queryStream = new QueryStream(QueryCtx, queryCtx, convexStream)

        const actual = yield* queryStream.unique()

        expect(actual).toEqual(doc)
      }),
    )

    it.effect("should return null for no documents", () =>
      E.gen(function* () {
        const queryCtx = mockGenericQueryCtx<DataModel>()
        const convexStream = mockConvexQueryStream<Doc<"user">>({
          take: vi.fn().mockResolvedValue([]),
        })
        const queryStream = new QueryStream(QueryCtx, queryCtx, convexStream)

        const actual = yield* queryStream.unique()

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

        const queryCtx = mockGenericQueryCtx<DataModel>()
        const convexStream = mockConvexQueryStream<Doc<"user">>({
          take: vi.fn().mockResolvedValue(docs),
        })
        const queryStream = new QueryStream(QueryCtx, queryCtx, convexStream)

        const actual = yield* queryStream.unique().pipe(E.flip)

        expect(actual).toBeInstanceOf(DocNotUniqueError)
      }),
    )
  })
})

describe("StreamQuery", () => {
  describe("order", () => {
    test("should have correct type signature", () => {
      const queryCtx = mockGenericQueryCtx<DataModel>()
      const convexStreamQuery = mockConvexStreamQuery<Schema, "user", "by_name">()
      const streamQuery = new StreamQuery(QueryCtx, queryCtx, convexStreamQuery)

      const actual = streamQuery.order("asc")

      expectTypeOf(actual).toEqualTypeOf<QueryStream<DataModel, Doc<"user">>>()
    })
  })
})

describe("StreamQueryInitializer", () => {
  describe("fullTableScan", () => {
    test("should have correct type signature", () => {
      const queryCtx = mockGenericQueryCtx<DataModel>()
      const convexStreamQueryInitializer = mockConvexStreamQueryInitializer<Schema, "user">()
      const streamQueryInitializer = new StreamQueryInitializer(
        QueryCtx,
        queryCtx,
        convexStreamQueryInitializer,
      )

      const actual = streamQueryInitializer.fullTableScan()

      expectTypeOf(actual).toEqualTypeOf<StreamQuery<Schema, "user", "by_creation_time">>()
    })
  })

  describe("withIndex", () => {
    test("should have correct type signature", () => {
      const queryCtx = mockGenericQueryCtx<DataModel>()
      const convexStreamQueryInitializer = mockConvexStreamQueryInitializer<Schema, "user">()
      const streamQueryInitializer = new StreamQueryInitializer(
        QueryCtx,
        queryCtx,
        convexStreamQueryInitializer,
      )

      const actual = streamQueryInitializer.withIndex("by_name")

      expectTypeOf(actual).toEqualTypeOf<StreamQuery<Schema, "user", "by_name">>()
    })
  })

  describe("order", () => {
    test("should have correct type signature", () => {
      const queryCtx = mockGenericQueryCtx<DataModel>()
      const convexStreamQueryInitializer = mockConvexStreamQueryInitializer<Schema, "user">()
      const streamQueryInitializer = new StreamQueryInitializer(
        QueryCtx,
        queryCtx,
        convexStreamQueryInitializer,
      )

      const actual = streamQueryInitializer.order("desc")

      expectTypeOf(actual).toEqualTypeOf<QueryStream<DataModel, Doc<"user">>>()
    })
  })
})

describe("StreamDatabaseReader", () => {
  describe("query", () => {
    test("should have correct type signature", () => {
      const queryCtx = mockGenericQueryCtx<DataModel>()
      const convexStreamDb = mockConvexStreamDatabaseReader<Schema>()
      const streamDb = new StreamDatabaseReader(QueryCtx, queryCtx, convexStreamDb)

      const actual = streamDb.query("user")

      expectTypeOf(actual).toEqualTypeOf<StreamQueryInitializer<Schema, "user">>()
    })
  })
})

describe("stream", () => {
  test("should return StreamDatabaseReader", () => {
    const queryCtx = mockGenericQueryCtx<DataModel>()
    const actual = stream(QueryCtx, queryCtx, _schema)

    expectTypeOf(actual).toEqualTypeOf<StreamDatabaseReader<Schema>>()
  })
})

describe("Helper functions", () => {
  describe("takeFromStream", () => {
    test("should return curried function", () => {
      const takeFn = takeFromStream(5)

      expectTypeOf(takeFn).toBeFunction()
    })
  })

  describe("paginateStream", () => {
    test("should return curried function", () => {
      const paginateFn = paginateStream({cursor: null, numItems: 10})

      expectTypeOf(paginateFn).toBeFunction()
    })
  })

  describe("firstFromStream", () => {
    it.effect("should return Option.some when document exists", () =>
      E.gen(function* () {
        const doc: Doc<"user"> = {
          _id: mockGenericId("user", "user-1"),
          _creationTime: Date.now(),
          name: "John",
          age: 22,
        }

        const queryCtx = mockGenericQueryCtx<DataModel>()
        const convexStream = mockConvexQueryStream<Doc<"user">>({
          first: vi.fn().mockResolvedValue(doc),
        })
        const queryStream = new QueryStream(QueryCtx, queryCtx, convexStream)

        const actual = yield* firstFromStream(queryStream)

        expectTypeOf(actual).toEqualTypeOf<Option.Option<Doc<"user">>>()
        expect(Option.isSome(actual)).toBe(true)
        expect(Option.getOrNull(actual)).toEqual(doc)
      }),
    )

    it.effect("should return Option.none when no documents exist", () =>
      E.gen(function* () {
        const queryCtx = mockGenericQueryCtx<DataModel>()
        const convexStream = mockConvexQueryStream<Doc<"user">>({
          first: vi.fn().mockResolvedValue(null),
        })
        const queryStream = new QueryStream(QueryCtx, queryCtx, convexStream)

        const actual = yield* firstFromStream(queryStream)

        expect(Option.isNone(actual)).toBe(true)
      }),
    )
  })

  describe("uniqueFromStream", () => {
    it.effect("should return Option.some for single document", () =>
      E.gen(function* () {
        const doc: Doc<"user"> = {
          _id: mockGenericId("user", "user-1"),
          _creationTime: Date.now(),
          name: "John",
          age: 22,
        }

        const queryCtx = mockGenericQueryCtx<DataModel>()
        const convexStream = mockConvexQueryStream<Doc<"user">>({
          take: vi.fn().mockResolvedValue([doc]),
        })
        const queryStream = new QueryStream(QueryCtx, queryCtx, convexStream)

        const actual = yield* uniqueFromStream(queryStream)

        expectTypeOf(actual).toEqualTypeOf<Option.Option<Doc<"user">>>()
        expect(Option.isSome(actual)).toBe(true)
        expect(Option.getOrNull(actual)).toEqual(doc)
      }),
    )

    it.effect("should return Option.none for no documents", () =>
      E.gen(function* () {
        const queryCtx = mockGenericQueryCtx<DataModel>()
        const convexStream = mockConvexQueryStream<Doc<"user">>({
          take: vi.fn().mockResolvedValue([]),
        })
        const queryStream = new QueryStream(QueryCtx, queryCtx, convexStream)

        const actual = yield* uniqueFromStream(queryStream)

        expect(Option.isNone(actual)).toBe(true)
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

        const queryCtx = mockGenericQueryCtx<DataModel>()
        const convexStream = mockConvexQueryStream<Doc<"user">>({
          take: vi.fn().mockResolvedValue(docs),
        })
        const queryStream = new QueryStream(QueryCtx, queryCtx, convexStream)

        const actual = yield* uniqueFromStream(queryStream).pipe(E.flip)

        expect(actual).toBeInstanceOf(DocNotUniqueError)
      }),
    )
  })

  describe("mergedStream", () => {
    test("should throw for empty streams array", () => {
      expect(() => mergedStream([], ["_creationTime"])).toThrow(
        "Cannot union empty array of streams",
      )
    })

    it.effect("should merge multiple streams", () =>
      E.gen(function* () {
        const queryCtx = mockGenericQueryCtx<DataModel>()
        const convexStream1 = mockConvexQueryStream<Doc<"user">>({
          getIndexFields: vi.fn().mockReturnValue(["_creationTime", "_id"]),
        })
        const convexStream2 = mockConvexQueryStream<Doc<"user">>({
          getIndexFields: vi.fn().mockReturnValue(["_creationTime", "_id"]),
        })
        const queryStream1 = new QueryStream(QueryCtx, queryCtx, convexStream1)
        const queryStream2 = new QueryStream(QueryCtx, queryCtx, convexStream2)

        const merged = mergedStream([queryStream1, queryStream2], ["_creationTime", "_id"])

        expect(merged).toBeInstanceOf(QueryStream)
      }),
    )
  })
})
