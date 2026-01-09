import type {
  DataModelFromSchemaDefinition,
  DocumentByName,
  NamedTableInfo,
  TableNamesInDataModel,
} from "convex/server"
import type {GenericId} from "convex/values"
import type {QueryStream, StreamQuery, StreamQueryInitializer} from "../helpers/server/stream"
import type {
  DocNotUniqueError,
  GenericMutationCtx,
  GenericQueryCtx,
  OrderedQuery,
  Query,
  QueryInitializer,
  SPaginationResult,
} from "../server"

import {describe, expect, expectTypeOf, it, test, vi} from "@effect/vitest"
import {defineSchema, defineTable} from "convex/server"
import {v} from "convex/values"
import {Effect as E, Option, ParseResult, Schema as S} from "effect"

import {
  mockConvexGenericDatabaseReader,
  mockConvexGenericDatabaseWriter,
  mockGenericId,
  mockGenericMutationCtx,
  mockGenericQueryCtx,
  mockOrderedQuery,
  mockQuery,
  mockQueryInitializer,
  mockQueryStream,
  mockStreamQueryInitializer,
} from "src/test/mock"
import {createMutationCtx, createQueryCtx, DocNotFoundError, InvalidDocIdError} from "../server"
import {createModelFunction} from "./model"

const schema = defineSchema({
  user: defineTable({
    name: v.string(),
    age: v.number(),
  })
    .index("by_age", ["age"])
    .searchIndex("by_name", {searchField: "name"}),
})

type DataModel = DataModelFromSchemaDefinition<typeof schema>
type TableNames = TableNamesInDataModel<DataModel>
type TableInfo<TableName extends TableNames> = NamedTableInfo<DataModel, TableName>
type Id<TableName extends TableNames> = GenericId<TableName>
type Doc<TableName extends TableNames> = DocumentByName<DataModel, TableName>

const QueryCtx = createQueryCtx<DataModel>()
const MutationCtx = createMutationCtx<DataModel>()

const {model} = createModelFunction({schema, QueryCtx, MutationCtx})

describe("model", () => {
  const User = model("user", S.Struct({name: S.String, age: S.Number.pipe(S.positive())}))
  type UserDocument = S.Schema.Type<typeof User.Document>

  const doc: Doc<"user"> = {
    _id: mockGenericId("user", "user-id"),
    _creationTime: Date.now(),
    name: "Joe",
    age: 22,
  }

  describe("normalizeId", () => {
    test("should have correct type signature", () => {
      const actual = User.normalizeId("user-id")

      expectTypeOf(actual).toEqualTypeOf<
        E.Effect<Id<"user">, InvalidDocIdError, GenericQueryCtx<DataModel>>
      >()
    })

    it.effect("should fail with InvalidDocIdError if the value is not a valid doc id", () =>
      E.gen(function* () {
        const actual = yield* User.normalizeId("user-id").pipe(E.flip)
        expect(actual).toBeInstanceOf(InvalidDocIdError)
      }).pipe(
        E.provideService(
          QueryCtx,
          mockGenericQueryCtx<DataModel>({
            db: mockConvexGenericDatabaseReader<DataModel>({
              normalizeId: vi.fn().mockReturnValue(null),
            }),
          }),
        ),
      ),
    )

    it.effect("should return id if value is a valid doc id", () =>
      E.gen(function* () {
        const actual = yield* User.normalizeId("user-id")
        expect(actual).toEqual("user-id")
      }).pipe(
        E.provideService(
          QueryCtx,
          mockGenericQueryCtx<DataModel>({
            db: mockConvexGenericDatabaseReader<DataModel>({
              normalizeId: vi.fn().mockReturnValue("user-id"),
            }),
          }),
        ),
      ),
    )
  })

  describe("normalizeIdNullable", () => {
    test("should have correct type signature", () => {
      const actual = User.normalizeIdNullable("user-id")

      expectTypeOf(actual).toEqualTypeOf<
        E.Effect<Id<"user"> | null, never, GenericQueryCtx<DataModel>>
      >()
    })

    it.effect("should return null if the value is not a valid doc id", () =>
      E.gen(function* () {
        const actual = yield* User.normalizeIdNullable("user-id")
        expect(actual).toEqual(null)
      }).pipe(
        E.provideService(
          QueryCtx,
          mockGenericQueryCtx<DataModel>({
            db: mockConvexGenericDatabaseReader<DataModel>({
              normalizeId: vi.fn().mockReturnValue(null),
            }),
          }),
        ),
      ),
    )

    it.effect("should return id if value is a valid doc id", () =>
      E.gen(function* () {
        const actual = yield* User.normalizeIdNullable("user-id")
        expect(actual).toEqual("user-id")
      }).pipe(
        E.provideService(
          QueryCtx,
          mockGenericQueryCtx<DataModel>({
            db: mockConvexGenericDatabaseReader<DataModel>({
              normalizeId: vi.fn().mockReturnValue("user-id"),
            }),
          }),
        ),
      ),
    )
  })

  describe("normalizeIdOption", () => {
    test("should have correct type signature", () => {
      const actual = User.normalizeIdOption("user-id")

      expectTypeOf(actual).toEqualTypeOf<
        E.Effect<Option.Option<Id<"user">>, never, GenericQueryCtx<DataModel>>
      >()
    })

    it.effect("should return None if the value is not a valid doc id", () =>
      E.gen(function* () {
        const actual = yield* User.normalizeIdOption("user-id")
        expect(actual).toEqual(Option.none())
      }).pipe(
        E.provideService(
          QueryCtx,
          mockGenericQueryCtx<DataModel>({
            db: mockConvexGenericDatabaseReader<DataModel>({
              normalizeId: vi.fn().mockReturnValue(null),
            }),
          }),
        ),
      ),
    )

    it.effect("should return Some(id) if value is a valid doc id", () =>
      E.gen(function* () {
        const actual = yield* User.normalizeIdOption("user-id")
        expect(actual).toEqual(Option.some("user-id"))
      }).pipe(
        E.provideService(
          QueryCtx,
          mockGenericQueryCtx<DataModel>({
            db: mockConvexGenericDatabaseReader<DataModel>({
              normalizeId: vi.fn().mockReturnValue("user-id"),
            }),
          }),
        ),
      ),
    )
  })

  describe("getById", () => {
    test("should have correct type signature", () => {
      const actual = User.getById(mockGenericId("user", "user-id"))

      expectTypeOf(actual).toEqualTypeOf<
        E.Effect<UserDocument, DocNotFoundError, GenericQueryCtx<DataModel>>
      >()
    })

    it.effect("should fail with DocNotFoundError when there is no doc for the provided id", () =>
      E.gen(function* () {
        const actual = yield* User.getById(mockGenericId("user", "user-id")).pipe(E.flip)
        expect(actual).toBeInstanceOf(DocNotFoundError)
      }).pipe(
        E.provideService(
          QueryCtx,
          mockGenericQueryCtx<DataModel>({
            db: mockConvexGenericDatabaseReader<DataModel>({
              get: vi.fn().mockResolvedValue(null),
            }),
          }),
        ),
      ),
    )

    it.effect("should return Doc when there is a doc for the provided id", () =>
      E.gen(function* () {
        const actual = yield* User.getById(mockGenericId("user", "user-id"))
        expect(actual).toEqual(doc)
      }).pipe(
        E.provideService(
          QueryCtx,
          mockGenericQueryCtx<DataModel>({
            db: mockConvexGenericDatabaseReader<DataModel>({
              get: vi.fn().mockResolvedValue(doc),
            }),
          }),
        ),
      ),
    )

    test("should die if cannot decode doc", async () => {
      const id = mockGenericId("user", "user-id")
      await expect(async () =>
        User.getById(id).pipe(
          E.provideService(
            QueryCtx,
            mockGenericQueryCtx<DataModel>({
              db: mockConvexGenericDatabaseReader<DataModel>({
                get: vi
                  .fn()
                  .mockResolvedValue({_id: id, _creationTime: Date.now(), name: "Joe", age: -1}),
              }),
            }),
          ),
          E.runPromise,
        ),
      ).rejects.toThrowError(/userDocument|age/)
    })
  })

  describe("getByIdNullable", () => {
    test("should have correct type signature", () => {
      const actual = User.getByIdNullable(mockGenericId("user", "user-id"))

      expectTypeOf(actual).toEqualTypeOf<
        E.Effect<UserDocument | null, never, GenericQueryCtx<DataModel>>
      >()
    })

    it.effect("should return null when there is no doc for the provided id", () =>
      E.gen(function* () {
        const actual = yield* User.getByIdNullable(mockGenericId("user", "user-id"))
        expect(actual).toBeNull()
      }).pipe(
        E.provideService(
          QueryCtx,
          mockGenericQueryCtx<DataModel>({
            db: mockConvexGenericDatabaseReader<DataModel>({
              get: vi.fn().mockResolvedValue(null),
            }),
          }),
        ),
      ),
    )

    it.effect("should return Doc when there is a doc for the provided id", () =>
      E.gen(function* () {
        const actual = yield* User.getByIdNullable(mockGenericId("user", "user-id"))
        expect(actual).toEqual(doc)
      }).pipe(
        E.provideService(
          QueryCtx,
          mockGenericQueryCtx<DataModel>({
            db: mockConvexGenericDatabaseReader<DataModel>({
              get: vi.fn().mockResolvedValue(doc),
            }),
          }),
        ),
      ),
    )

    test("should die if cannot decode doc", async () => {
      const id = mockGenericId("user", "user-id")
      await expect(async () =>
        User.getByIdNullable(id).pipe(
          E.provideService(
            QueryCtx,
            mockGenericQueryCtx<DataModel>({
              db: mockConvexGenericDatabaseReader<DataModel>({
                get: vi
                  .fn()
                  .mockResolvedValue({_id: id, _creationTime: Date.now(), name: "Joe", age: -1}),
              }),
            }),
          ),
          E.runPromise,
        ),
      ).rejects.toThrowError(/userDocument|age/)
    })
  })

  describe("getByIdOption", () => {
    test("should have correct type signature", () => {
      const actual = User.getByIdOption(mockGenericId("user", "user-id"))

      expectTypeOf(actual).toEqualTypeOf<
        E.Effect<Option.Option<UserDocument>, never, GenericQueryCtx<DataModel>>
      >()
    })

    it.effect("should return None when there is no doc for the provided id", () =>
      E.gen(function* () {
        const actual = yield* User.getByIdOption(mockGenericId("user", "user-id"))
        expect(actual).toEqual(Option.none())
      }).pipe(
        E.provideService(
          QueryCtx,
          mockGenericQueryCtx<DataModel>({
            db: mockConvexGenericDatabaseReader<DataModel>({
              get: vi.fn().mockResolvedValue(null),
            }),
          }),
        ),
      ),
    )

    it.effect("should return Some(Doc) when there is a doc for the provided id", () =>
      E.gen(function* () {
        const actual = yield* User.getByIdOption(mockGenericId("user", "user-id"))
        expect(actual).toEqual(Option.some(doc))
      }).pipe(
        E.provideService(
          QueryCtx,
          mockGenericQueryCtx<DataModel>({
            db: mockConvexGenericDatabaseReader<DataModel>({
              get: vi.fn().mockResolvedValue(doc),
            }),
          }),
        ),
      ),
    )

    test("should die if cannot decode doc", async () => {
      const id = mockGenericId("user", "user-id")
      await expect(async () =>
        User.getByIdOption(id).pipe(
          E.provideService(
            QueryCtx,
            mockGenericQueryCtx<DataModel>({
              db: mockConvexGenericDatabaseReader<DataModel>({
                get: vi
                  .fn()
                  .mockResolvedValue({_id: id, _creationTime: Date.now(), name: "Joe", age: -1}),
              }),
            }),
          ),
          E.runPromise,
        ),
      ).rejects.toThrowError(/userDocument|age/)
    })
  })

  describe("insert", () => {
    test("should have correct type signature", () => {
      const actual = User.insert({name: "Joe", age: 22})

      expectTypeOf(actual).toEqualTypeOf<
        E.Effect<Id<"user">, ParseResult.ParseError, GenericMutationCtx<DataModel>>
      >()
    })

    it.effect("should insert a document and return the id", () =>
      E.gen(function* () {
        const insertedId = mockGenericId("user", "new-user-id")
        const actual = yield* User.insert({name: "Joe", age: 22})
        expect(actual).toEqual(insertedId)
      }).pipe(
        E.provideService(
          MutationCtx,
          mockGenericMutationCtx<DataModel>({
            db: mockConvexGenericDatabaseWriter<DataModel>({
              insert: vi.fn().mockResolvedValue(mockGenericId("user", "new-user-id")),
            }),
          }),
        ),
      ),
    )

    it.effect("should return ParseError if value in not valid", () =>
      E.gen(function* () {
        const actual = yield* User.insert({name: "Joe", age: -1}).pipe(E.flip)
        expect(actual).toBeInstanceOf(ParseResult.ParseError)
      }).pipe(E.provideService(MutationCtx, mockGenericMutationCtx<DataModel>())),
    )
  })

  describe("insertAndGet", () => {
    test("should have correct type signature", () => {
      const actual = User.insertAndGet({name: "Joe", age: 22})

      expectTypeOf(actual).toEqualTypeOf<
        E.Effect<
          UserDocument,
          ParseResult.ParseError,
          GenericQueryCtx<DataModel> | GenericMutationCtx<DataModel>
        >
      >()
    })

    it.effect("should insert a document and return it", () =>
      E.gen(function* () {
        const insertedId = mockGenericId("user", "new-user-id")
        const newDoc = {...doc, _id: insertedId}
        const actual = yield* User.insertAndGet({name: "Joe", age: 22})
        expect(actual).toEqual(newDoc)
      }).pipe(
        E.provideService(
          QueryCtx,
          mockGenericQueryCtx<DataModel>({
            db: mockConvexGenericDatabaseReader<DataModel>({
              get: vi.fn().mockResolvedValue({...doc, _id: mockGenericId("user", "new-user-id")}),
            }),
          }),
        ),
        E.provideService(
          MutationCtx,
          mockGenericMutationCtx<DataModel>({
            db: mockConvexGenericDatabaseWriter<DataModel>({
              insert: vi.fn().mockResolvedValue(mockGenericId("user", "new-user-id")),
            }),
          }),
        ),
      ),
    )

    it.effect("should return ParseError if value in not valid", () =>
      E.gen(function* () {
        const actual = yield* User.insertAndGet({name: "Joe", age: -1}).pipe(E.flip)
        expect(actual).toBeInstanceOf(ParseResult.ParseError)
      }).pipe(
        E.provideService(QueryCtx, mockGenericQueryCtx<DataModel>()),
        E.provideService(MutationCtx, mockGenericMutationCtx<DataModel>()),
      ),
    )

    test("should die if cannot decode doc", async () => {
      const id = mockGenericId("user", "user-id")
      await expect(async () =>
        User.insertAndGet({name: "Joe", age: 1}).pipe(
          E.provideService(
            QueryCtx,
            mockGenericQueryCtx<DataModel>({
              db: mockConvexGenericDatabaseReader<DataModel>({
                get: vi
                  .fn()
                  .mockResolvedValue({_id: id, _creationTime: Date.now(), name: "Joe", age: -1}),
              }),
            }),
          ),
          E.provideService(
            MutationCtx,
            mockGenericMutationCtx<DataModel>({
              db: mockConvexGenericDatabaseWriter<DataModel>({
                insert: vi.fn().mockResolvedValue(id),
              }),
            }),
          ),
          E.runPromise,
        ),
      ).rejects.toThrowError(/userDocument|age/)
    })

    test("should die if cannot find inserted doc", async () => {
      const insertedId = mockGenericId("user", "new-user-id")

      await expect(async () =>
        User.insertAndGet({name: "Joe", age: 22}).pipe(
          E.provideService(
            QueryCtx,
            mockGenericQueryCtx<DataModel>({
              db: mockConvexGenericDatabaseReader<DataModel>({
                get: vi.fn().mockResolvedValue(null),
              }),
            }),
          ),
          E.provideService(
            MutationCtx,
            mockGenericMutationCtx<DataModel>({
              db: mockConvexGenericDatabaseWriter<DataModel>({
                insert: vi.fn().mockResolvedValue(insertedId),
              }),
            }),
          ),
          E.runPromise,
        ),
      ).rejects.toThrowError(`Could not found inserted doc`)
    })
  })

  describe("patchById", () => {
    test("should have correct type signature", () => {
      const actual = User.patchById(mockGenericId("user", "user-id"), {age: 23})

      expectTypeOf(actual).toEqualTypeOf<
        E.Effect<void, ParseResult.ParseError, GenericMutationCtx<DataModel>>
      >()
    })

    it.effect("should patch a document by id", () =>
      E.gen(function* () {
        yield* User.patchById(mockGenericId("user", "user-id"), {age: 23})
      }).pipe(
        E.provideService(
          MutationCtx,
          mockGenericMutationCtx<DataModel>({
            db: mockConvexGenericDatabaseWriter<DataModel>({
              patch: vi.fn().mockResolvedValue(undefined),
            }),
          }),
        ),
      ),
    )

    it.effect("should return ParseError if value in not valid", () =>
      E.gen(function* () {
        const actual = yield* User.patchById(mockGenericId("user", "user-id"), {age: -1}).pipe(
          E.flip,
        )
        expect(actual).toBeInstanceOf(ParseResult.ParseError)
      }).pipe(E.provideService(MutationCtx, mockGenericMutationCtx<DataModel>())),
    )
  })

  describe("patchByIdAndGet", () => {
    test("should have correct type signature", () => {
      const actual = User.patchByIdAndGet(mockGenericId("user", "user-id"), {age: 23})

      expectTypeOf(actual).toEqualTypeOf<
        E.Effect<
          UserDocument,
          ParseResult.ParseError,
          GenericQueryCtx<DataModel> | GenericMutationCtx<DataModel>
        >
      >()
    })

    it.effect("should patch a document by id and return it", () =>
      E.gen(function* () {
        const patchedDoc = {...doc, age: 23}
        const actual = yield* User.patchByIdAndGet(mockGenericId("user", "user-id"), {age: 23})
        expect(actual).toEqual(patchedDoc)
      }).pipe(
        E.provideService(
          QueryCtx,
          mockGenericQueryCtx<DataModel>({
            db: mockConvexGenericDatabaseReader<DataModel>({
              get: vi.fn().mockResolvedValue({...doc, age: 23}),
            }),
          }),
        ),
        E.provideService(
          MutationCtx,
          mockGenericMutationCtx<DataModel>({
            db: mockConvexGenericDatabaseWriter<DataModel>({
              patch: vi.fn().mockResolvedValue(undefined),
            }),
          }),
        ),
      ),
    )

    it.effect("should return ParseError if value in not valid", () =>
      E.gen(function* () {
        const actual = yield* User.patchByIdAndGet(mockGenericId("user", "user-id"), {
          age: -1,
        }).pipe(E.flip)
        expect(actual).toBeInstanceOf(ParseResult.ParseError)
      }).pipe(
        E.provideService(QueryCtx, mockGenericQueryCtx<DataModel>()),
        E.provideService(MutationCtx, mockGenericMutationCtx<DataModel>()),
      ),
    )

    test("should die if cannot decode doc", async () => {
      const id = mockGenericId("user", "user-id")
      await expect(async () =>
        User.patchByIdAndGet(id, {age: 23}).pipe(
          E.provideService(
            QueryCtx,
            mockGenericQueryCtx<DataModel>({
              db: mockConvexGenericDatabaseReader<DataModel>({
                get: vi
                  .fn()
                  .mockResolvedValue({_id: id, _creationTime: Date.now(), name: "Joe", age: -1}),
              }),
            }),
          ),
          E.provideService(
            MutationCtx,
            mockGenericMutationCtx<DataModel>({
              db: mockConvexGenericDatabaseWriter<DataModel>({
                patch: vi.fn().mockResolvedValue(undefined),
              }),
            }),
          ),
          E.runPromise,
        ),
      ).rejects.toThrowError(/userDocument|age/)
    })

    test("should die if cannot find patched doc", async () => {
      const id = mockGenericId("user", "user-id")
      await expect(async () =>
        User.patchByIdAndGet(id, {age: 23}).pipe(
          E.provideService(
            QueryCtx,
            mockGenericQueryCtx<DataModel>({
              db: mockConvexGenericDatabaseReader<DataModel>({
                get: vi.fn().mockResolvedValue(null),
              }),
            }),
          ),
          E.provideService(
            MutationCtx,
            mockGenericMutationCtx<DataModel>({
              db: mockConvexGenericDatabaseWriter<DataModel>({
                patch: vi.fn().mockResolvedValue(undefined),
              }),
            }),
          ),
          E.runPromise,
        ),
      ).rejects.toThrowError(`Could not found patched doc: ${id}`)
    })
  })

  describe("replaceById", () => {
    test("should have correct type signature", () => {
      const actual = User.replaceById(mockGenericId("user", "user-id"), {name: "Jane", age: 25})

      expectTypeOf(actual).toEqualTypeOf<
        E.Effect<void, ParseResult.ParseError, GenericMutationCtx<DataModel>>
      >()
    })

    it.effect("should replace a document by id", () =>
      E.gen(function* () {
        yield* User.replaceById(mockGenericId("user", "user-id"), {name: "Jane", age: 25})
      }).pipe(
        E.provideService(
          MutationCtx,
          mockGenericMutationCtx<DataModel>({
            db: mockConvexGenericDatabaseWriter<DataModel>({
              replace: vi.fn().mockResolvedValue(undefined),
            }),
          }),
        ),
      ),
    )

    it.effect("should return ParseError if value in not valid", () =>
      E.gen(function* () {
        const actual = yield* User.replaceById(mockGenericId("user", "user-id"), {
          name: "Jane",
          age: -1,
        }).pipe(E.flip)
        expect(actual).toBeInstanceOf(ParseResult.ParseError)
      }).pipe(E.provideService(MutationCtx, mockGenericMutationCtx<DataModel>())),
    )
  })

  describe("replaceByIdAndGet", () => {
    test("should have correct type signature", () => {
      const actual = User.replaceByIdAndGet(mockGenericId("user", "user-id"), {
        name: "Jane",
        age: 25,
      })

      expectTypeOf(actual).toEqualTypeOf<
        E.Effect<
          UserDocument,
          ParseResult.ParseError,
          GenericQueryCtx<DataModel> | GenericMutationCtx<DataModel>
        >
      >()
    })

    it.effect("should replace a document by id and return it", () =>
      E.gen(function* () {
        const replacedDoc = {...doc, name: "Jane", age: 25}
        const actual = yield* User.replaceByIdAndGet(mockGenericId("user", "user-id"), {
          name: "Jane",
          age: 25,
        })
        expect(actual).toEqual(replacedDoc)
      }).pipe(
        E.provideService(
          QueryCtx,
          mockGenericQueryCtx<DataModel>({
            db: mockConvexGenericDatabaseReader<DataModel>({
              get: vi.fn().mockResolvedValue({...doc, name: "Jane", age: 25}),
            }),
          }),
        ),
        E.provideService(
          MutationCtx,
          mockGenericMutationCtx<DataModel>({
            db: mockConvexGenericDatabaseWriter<DataModel>({
              replace: vi.fn().mockResolvedValue(undefined),
            }),
          }),
        ),
      ),
    )

    it.effect("should return ParseError if value in not valid", () =>
      E.gen(function* () {
        const actual = yield* User.replaceByIdAndGet(mockGenericId("user", "user-id"), {
          name: "Jane",
          age: -1,
        }).pipe(E.flip)
        expect(actual).toBeInstanceOf(ParseResult.ParseError)
      }).pipe(
        E.provideService(QueryCtx, mockGenericQueryCtx<DataModel>()),
        E.provideService(MutationCtx, mockGenericMutationCtx<DataModel>()),
      ),
    )

    test("should die if cannot decode doc", async () => {
      const id = mockGenericId("user", "user-id")
      await expect(async () =>
        User.replaceByIdAndGet(id, {name: "Jane", age: 25}).pipe(
          E.provideService(
            QueryCtx,
            mockGenericQueryCtx<DataModel>({
              db: mockConvexGenericDatabaseReader<DataModel>({
                get: vi
                  .fn()
                  .mockResolvedValue({_id: id, _creationTime: Date.now(), name: "Jane", age: -1}),
              }),
            }),
          ),
          E.provideService(
            MutationCtx,
            mockGenericMutationCtx<DataModel>({
              db: mockConvexGenericDatabaseWriter<DataModel>({
                replace: vi.fn().mockResolvedValue(undefined),
              }),
            }),
          ),
          E.runPromise,
        ),
      ).rejects.toThrowError(/userDocument|age/)
    })

    test("should die if cannot find replaced doc", async () => {
      const id = mockGenericId("user", "user-id")
      await expect(async () =>
        User.replaceByIdAndGet(mockGenericId("user", "user-id"), {
          name: "Jane",
          age: 25,
        }).pipe(
          E.provideService(
            QueryCtx,
            mockGenericQueryCtx<DataModel>({
              db: mockConvexGenericDatabaseReader<DataModel>({
                get: vi.fn().mockResolvedValue(null),
              }),
            }),
          ),
          E.provideService(
            MutationCtx,
            mockGenericMutationCtx<DataModel>({
              db: mockConvexGenericDatabaseWriter<DataModel>({
                replace: vi.fn().mockResolvedValue(undefined),
              }),
            }),
          ),
          E.runPromise,
        ),
      ).rejects.toThrowError(`Could not found replaced doc: ${id}`)
    })
  })

  describe("deleteById", () => {
    test("should have correct type signature", () => {
      const actual = User.deleteById(mockGenericId("user", "user-id"))

      expectTypeOf(actual).toEqualTypeOf<E.Effect<void, never, GenericMutationCtx<DataModel>>>()
    })

    it.effect("should delete a document by id", () =>
      E.gen(function* () {
        yield* User.deleteById(mockGenericId("user", "user-id"))
      }).pipe(
        E.provideService(
          MutationCtx,
          mockGenericMutationCtx<DataModel>({
            db: mockConvexGenericDatabaseWriter<DataModel>({
              delete: vi.fn().mockResolvedValue(undefined),
            }),
          }),
        ),
      ),
    )
  })

  describe("query", () => {
    test("should have correct type signature", () => {
      const actual = User.query

      expectTypeOf(actual).toEqualTypeOf<
        E.Effect<QueryInitializer<TableInfo<"user">>, never, GenericQueryCtx<DataModel>>
      >()
    })
  })

  describe("stream", () => {
    test("should have correct type signature", () => {
      const actual = User.stream

      expectTypeOf(actual).toEqualTypeOf<
        E.Effect<StreamQueryInitializer<typeof schema, "user">, never, GenericQueryCtx<DataModel>>
      >()
    })
  })

  describe("fullTableScan", () => {
    test("should have correct type signature", () => {
      const queryInitializer = mockQueryInitializer<TableInfo<"user">>()
      const actual = User.fullTableScan(queryInitializer)

      expectTypeOf(actual).toEqualTypeOf<Query<TableInfo<"user">>>()
    })
  })

  describe("withIndex", () => {
    test("should have correct type signature", () => {
      const queryInitializer = mockQueryInitializer<TableInfo<"user">>()
      const actual = User.withIndex("by_age")(queryInitializer)

      expectTypeOf(actual).toEqualTypeOf<Query<TableInfo<"user">>>()
    })

    test("should have correct type signature with index range", () => {
      const queryInitializer = mockQueryInitializer<TableInfo<"user">>()
      const actual = User.withIndex("by_age", (q) => q.eq("age", 22))(queryInitializer)

      expectTypeOf(actual).toEqualTypeOf<Query<TableInfo<"user">>>()
    })
  })

  describe("withStreamIndex", () => {
    test("should have correct type signature", () => {
      const streamQueryInitializer = mockStreamQueryInitializer<typeof schema, "user">()
      const actual = User.withStreamIndex("by_age")(streamQueryInitializer)

      expectTypeOf(actual).toEqualTypeOf<StreamQuery<typeof schema, "user", "by_age">>()
    })
  })

  describe("withSearchIndex", () => {
    test("should have correct type signature", () => {
      const queryInitializer = mockQueryInitializer<TableInfo<"user">>()
      const actual = User.withSearchIndex("by_name", (q) => q.search("name", "Joe"))(
        queryInitializer,
      )

      expectTypeOf(actual).toEqualTypeOf<OrderedQuery<TableInfo<"user">>>()
    })
  })

  describe("filter", () => {
    test("should have correct type signature", () => {
      const orderedQuery = mockOrderedQuery<TableInfo<"user">>()
      const actual = User.filter((q) => q.eq(q.field("age"), 22))(orderedQuery)

      expectTypeOf(actual).toEqualTypeOf<OrderedQuery<TableInfo<"user">>>()
    })

    test("should have correct type signature with Query", () => {
      const query = mockQuery<TableInfo<"user">>()
      const actual = User.filter((q) => q.eq(q.field("age"), 22))(query)

      expectTypeOf(actual).toEqualTypeOf<Query<TableInfo<"user">>>()
    })
  })

  describe("order", () => {
    test("should have correct type signature with asc", () => {
      const queryInitializer = mockQueryInitializer<TableInfo<"user">>()
      const actual = User.order("asc")(queryInitializer)

      expectTypeOf(actual).toEqualTypeOf<OrderedQuery<TableInfo<"user">>>()
    })

    test("should have correct type signature with desc", () => {
      const queryInitializer = mockQueryInitializer<TableInfo<"user">>()
      const actual = User.order("desc")(queryInitializer)

      expectTypeOf(actual).toEqualTypeOf<OrderedQuery<TableInfo<"user">>>()
    })
  })

  describe("collect", () => {
    test("should have correct type signature", () => {
      const orderedQuery = mockOrderedQuery<TableInfo<"user">>()
      const actual = User.collect(orderedQuery)

      expectTypeOf(actual).toEqualTypeOf<E.Effect<readonly UserDocument[], never, never>>()
    })

    it.effect("should return decoded documents", () =>
      E.gen(function* () {
        const orderedQuery = mockOrderedQuery<TableInfo<"user">>({
          collect: vi.fn().mockResolvedValue([doc]),
        })

        const actual = yield* User.collect(orderedQuery)

        expect(actual).toEqual([doc])
      }),
    )

    it.effect("should return empty array when no documents", () =>
      E.gen(function* () {
        const orderedQuery = mockOrderedQuery<TableInfo<"user">>({
          collect: vi.fn().mockResolvedValue([]),
        })

        const actual = yield* User.collect(orderedQuery)

        expect(actual).toEqual([])
      }),
    )
  })

  describe("take", () => {
    test("should have correct type signature", () => {
      const orderedQuery = mockOrderedQuery<TableInfo<"user">>()
      const actual = User.take(5)(orderedQuery)

      expectTypeOf(actual).toEqualTypeOf<E.Effect<readonly UserDocument[], never, never>>()
    })

    it.effect("should return decoded documents", () =>
      E.gen(function* () {
        const orderedQuery = mockOrderedQuery<TableInfo<"user">>({
          take: vi.fn().mockResolvedValue([doc]),
        })

        const actual = yield* User.take(5)(orderedQuery)

        expect(actual).toEqual([doc])
      }),
    )
  })

  describe("first", () => {
    test("should have correct type signature", () => {
      const orderedQuery = mockOrderedQuery<TableInfo<"user">>()
      const actual = User.first(orderedQuery)

      expectTypeOf(actual).toEqualTypeOf<E.Effect<Option.Option<UserDocument>, never, never>>()
    })

    it.effect("should return Some(doc) when document exists", () =>
      E.gen(function* () {
        const orderedQuery = mockOrderedQuery<TableInfo<"user">>({
          first: vi.fn().mockResolvedValue(doc),
        })

        const actual = yield* User.first(orderedQuery)

        expect(actual).toEqual(Option.some(doc))
      }),
    )

    it.effect("should return None when no document exists", () =>
      E.gen(function* () {
        const orderedQuery = mockOrderedQuery<TableInfo<"user">>({
          first: vi.fn().mockResolvedValue(null),
        })

        const actual = yield* User.first(orderedQuery)

        expect(actual).toEqual(Option.none())
      }),
    )
  })

  describe("unique", () => {
    test("should have correct type signature", () => {
      const orderedQuery = mockOrderedQuery<TableInfo<"user">>()
      const actual = User.unique(orderedQuery)

      expectTypeOf(actual).toEqualTypeOf<
        E.Effect<Option.Option<UserDocument>, DocNotUniqueError, never>
      >()
    })

    it.effect("should return Some(doc) when exactly one document exists", () =>
      E.gen(function* () {
        // unique() calls take(2) internally, so we mock take
        const orderedQuery = mockOrderedQuery<TableInfo<"user">>({
          take: vi.fn().mockResolvedValue([doc]),
        })

        const actual = yield* User.unique(orderedQuery)

        expect(actual).toEqual(Option.some(doc))
      }),
    )

    it.effect("should return None when no document exists", () =>
      E.gen(function* () {
        // unique() calls take(2) internally, so we mock take
        const orderedQuery = mockOrderedQuery<TableInfo<"user">>({
          take: vi.fn().mockResolvedValue([]),
        })

        const actual = yield* User.unique(orderedQuery)

        expect(actual).toEqual(Option.none())
      }),
    )
  })

  describe("paginate", () => {
    test("should have correct type signature", () => {
      const orderedQuery = mockOrderedQuery<TableInfo<"user">>()
      const actual = User.paginate({numItems: 10, cursor: null})(orderedQuery)

      type ExpectedPaginationResult = S.Schema.Type<
        ReturnType<typeof SPaginationResult<typeof User.Document>>
      >
      expectTypeOf(actual).toEqualTypeOf<E.Effect<ExpectedPaginationResult, never, never>>()
    })

    it.effect("should return decoded pagination result", () =>
      E.gen(function* () {
        const paginationResult = {
          page: [doc],
          isDone: false,
          continueCursor: "cursor-123",
        }
        const orderedQuery = mockOrderedQuery<TableInfo<"user">>({
          paginate: vi.fn().mockResolvedValue(paginationResult),
        })

        const actual = yield* User.paginate({numItems: 10, cursor: null})(orderedQuery)

        expect(actual.page).toEqual([doc])
        expect(actual.isDone).toBe(false)
        expect(actual.continueCursor).toBe("cursor-123")
      }),
    )
  })

  describe("collectStream", () => {
    test("should have correct type signature", () => {
      const queryStream = mockQueryStream<DataModel, Doc<"user">>()

      const actual = User.collectStream(queryStream)

      expectTypeOf(actual).toEqualTypeOf<E.Effect<readonly UserDocument[], never, never>>()
    })
  })

  describe("takeFromStream", () => {
    test("should have correct type signature", () => {
      const queryStream = mockQueryStream<DataModel, Doc<"user">>()

      const actual = User.takeFromStream(5)(queryStream)

      expectTypeOf(actual).toEqualTypeOf<E.Effect<readonly UserDocument[], never, never>>()
    })
  })

  describe("firstFromStream", () => {
    test("should have correct type signature", () => {
      const queryStream = mockQueryStream<DataModel, Doc<"user">>()

      const actual = User.firstFromStream(queryStream)

      expectTypeOf(actual).toEqualTypeOf<E.Effect<Option.Option<UserDocument>, never, never>>()
    })
  })

  describe("uniqueFromStream", () => {
    test("should have correct type signature", () => {
      const queryStream = mockQueryStream<DataModel, Doc<"user">>()

      const actual = User.uniqueFromStream(queryStream)

      expectTypeOf(actual).toEqualTypeOf<
        E.Effect<Option.Option<UserDocument>, DocNotUniqueError, never>
      >()
    })
  })

  describe("paginateStream", () => {
    test("should have correct type signature", () => {
      const queryStream = mockQueryStream<DataModel, Doc<"user">>()

      const actual = User.paginateStream({numItems: 10, cursor: null})(queryStream)

      type ExpectedPaginationResult = S.Schema.Type<
        ReturnType<typeof SPaginationResult<typeof User.Document>>
      >
      expectTypeOf(actual).toEqualTypeOf<E.Effect<ExpectedPaginationResult, never, never>>()
    })
  })

  describe("orderStream", () => {
    test("should have correct type signature", () => {
      // orderStream returns a function that takes StreamQueryInitializer and returns QueryStream
      const orderFn = User.orderStream("asc")

      expectTypeOf(orderFn).toBeFunction()
    })
  })

  describe("filterStreamWith", () => {
    test("should have correct type signature", () => {
      const queryStream = mockQueryStream<DataModel, Doc<"user">>()

      const actual = User.filterStreamWith(() => E.succeed(true))(queryStream)

      expectTypeOf(actual).toEqualTypeOf<QueryStream<DataModel, Doc<"user">, never>>()
    })
  })

  describe("mapStream", () => {
    test("should have correct type signature", () => {
      const queryStream = mockQueryStream<DataModel, Doc<"user">>()

      const actual = User.mapStream((doc) => E.succeed({mapped: doc.name}))(queryStream)

      expectTypeOf(actual).toEqualTypeOf<QueryStream<DataModel, {mapped: string}, never>>()
    })
  })

  describe("flatMapStream", () => {
    test("should have correct type signature", () => {
      const queryStream = mockQueryStream<DataModel, Doc<"user">>()
      const innerStream = mockQueryStream<DataModel, {nested: string}>()

      const actual = User.flatMapStream(() => E.succeed(innerStream), ["nested"])(queryStream)

      expectTypeOf(actual).toEqualTypeOf<QueryStream<DataModel, {nested: string}, never>>()
    })
  })

  describe("distinctStream", () => {
    test("should have correct type signature", () => {
      const queryStream = mockQueryStream<DataModel, Doc<"user">>()

      const actual = User.distinctStream(["name"])(queryStream)

      expectTypeOf(actual).toEqualTypeOf<QueryStream<DataModel, Doc<"user">, never>>()
    })
  })
})
