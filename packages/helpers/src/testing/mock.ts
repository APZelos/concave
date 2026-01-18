import type {
  QueryStream as ConvexQueryStream,
  StreamDatabaseReader as ConvexStreamDatabaseReader,
  StreamQuery as ConvexStreamQuery,
  StreamQueryInitializer as ConvexStreamQueryInitializer,
} from "convex-helpers/server/stream"
import type {GenericDataModel, SchemaDefinition} from "convex/server"
import type {GenericStreamItem} from "../server/stream"

import {createQueryCtx} from "@apzelos/concave/server"
import {
  mockConvexBaseDatabaseReader,
  mockConvexGenericDatabaseReader,
  mockGenericQueryCtx,
  MockNotImplementedError,
} from "@apzelos/concave/testing"
import {vi} from "@effect/vitest"

import {QueryStream, StreamQueryInitializer} from "../server/stream"

function createBaseConvexQueryStreamMock<T extends GenericStreamItem>(): ConvexQueryStream<T> {
  const baseMock = {
    paginate: vi.fn().mockRejectedValue(new MockNotImplementedError()),
    collect: vi.fn().mockRejectedValue(new MockNotImplementedError()),
    take: vi.fn().mockRejectedValue(new MockNotImplementedError()),
    first: vi.fn().mockRejectedValue(new MockNotImplementedError()),
    unique: vi.fn().mockRejectedValue(new MockNotImplementedError()),
    filter: vi.fn().mockImplementation(() => {
      throw new Error("Use filterWith instead")
    }),
    [Symbol.asyncIterator]: vi.fn().mockRejectedValue(new MockNotImplementedError()),
    iterWithKeys: vi.fn().mockRejectedValue(new MockNotImplementedError()),
    getOrder: vi.fn().mockReturnValue("asc"),
    getIndexFields: vi.fn().mockReturnValue([]),
    getEqualityIndexFilter: vi.fn().mockReturnValue([]),
  } as unknown as ConvexQueryStream<T>

  // Set up methods that return the mock itself (lazy to avoid recursion)
  baseMock.filterWith = vi.fn().mockReturnValue(baseMock)
  baseMock.map = vi.fn().mockReturnValue(baseMock)
  baseMock.flatMap = vi.fn().mockReturnValue(baseMock)
  baseMock.distinct = vi.fn().mockReturnValue(baseMock)
  baseMock.narrow = vi.fn().mockReturnValue(baseMock)

  return baseMock
}

export function mockConvexQueryStream<T extends GenericStreamItem>(
  mock: Partial<ConvexQueryStream<T>> = {},
): ConvexQueryStream<T> {
  const baseMock = createBaseConvexQueryStreamMock<T>()
  return {
    ...baseMock,
    ...mock,
  } as unknown as ConvexQueryStream<T>
}

export function mockConvexStreamDatabaseReader<
  Schema extends SchemaDefinition<any, boolean>,
  DataModel extends GenericDataModel = GenericDataModel,
>(mock: Partial<ConvexStreamDatabaseReader<Schema>> = {}): ConvexStreamDatabaseReader<Schema> {
  const baseMock = {
    query: vi.fn().mockImplementation(() => mockConvexStreamQueryInitializer()),
    get: vi.fn().mockRejectedValue(new MockNotImplementedError()),
    normalizeId: vi.fn().mockReturnValue(null),
    db: mockConvexGenericDatabaseReader<DataModel>(),
    schema: {} as Schema,
    system: mockConvexBaseDatabaseReader(),
  } as unknown as ConvexStreamDatabaseReader<Schema>
  return {
    ...baseMock,
    ...mock,
  } as unknown as ConvexStreamDatabaseReader<Schema>
}

export function mockConvexStreamQueryInitializer<
  Schema extends SchemaDefinition<any, boolean> = SchemaDefinition<any, boolean>,
  TableName extends string = string,
>(
  mock: Partial<ConvexStreamQueryInitializer<Schema, TableName>> = {},
): ConvexStreamQueryInitializer<Schema, TableName> {
  const baseMock = createBaseConvexQueryStreamMock()
  const initializerMock = {
    ...baseMock,
    fullTableScan: vi.fn().mockImplementation(() => mockConvexStreamQuery()),
    withIndex: vi.fn().mockImplementation(() => mockConvexStreamQuery()),
    withSearchIndex: vi.fn().mockImplementation(() => {
      throw new Error("withSearchIndex is not supported on streams")
    }),
    order: vi.fn().mockReturnValue(baseMock),
  } as unknown as ConvexStreamQueryInitializer<Schema, TableName>
  return {
    ...initializerMock,
    ...mock,
  } as unknown as ConvexStreamQueryInitializer<Schema, TableName>
}

export function mockConvexStreamQuery<
  Schema extends SchemaDefinition<any, boolean> = SchemaDefinition<any, boolean>,
  TableName extends string = string,
  IndexName extends string = string,
>(
  mock: Partial<ConvexStreamQuery<Schema, TableName, IndexName>> = {},
): ConvexStreamQuery<Schema, TableName, IndexName> {
  const baseMock = createBaseConvexQueryStreamMock()
  const streamQueryMock = {
    ...baseMock,
    order: vi.fn().mockReturnValue(baseMock),
  } as unknown as ConvexStreamQuery<Schema, TableName, IndexName>
  return {
    ...streamQueryMock,
    ...mock,
  } as unknown as ConvexStreamQuery<Schema, TableName, IndexName>
}

export function mockQueryStream<
  DataModel extends GenericDataModel,
  T extends GenericStreamItem,
  SError = never,
>(mock: Partial<ConvexQueryStream<T>> = {}): QueryStream<DataModel, T, SError> {
  const QueryCtx = createQueryCtx<DataModel>()
  const queryCtx = mockGenericQueryCtx<DataModel>()
  const convexStream = mockConvexQueryStream<T>(mock)
  return new QueryStream(QueryCtx, queryCtx, convexStream)
}

export function mockStreamQueryInitializer<
  Schema extends SchemaDefinition<any, boolean>,
  TableName extends string,
>(
  mock: Partial<ConvexStreamQueryInitializer<Schema, TableName>> = {},
): StreamQueryInitializer<Schema, TableName> {
  const QueryCtx = createQueryCtx<GenericDataModel>()
  const queryCtx = mockGenericQueryCtx<GenericDataModel>()
  const convexStream = mockConvexStreamQueryInitializer<Schema, TableName>(mock)
  // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
  return new StreamQueryInitializer(QueryCtx as any, queryCtx as any, convexStream)
}
