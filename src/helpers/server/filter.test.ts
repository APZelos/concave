import type {
  DataModelFromSchemaDefinition,
  NamedTableInfo,
  TableNamesInDataModel,
} from "convex/server"
import type {OrderedQuery} from "../../server"

import {describe, expect, expectTypeOf, it, test} from "@effect/vitest"
import {defineSchema, defineTable} from "convex/server"
import {v} from "convex/values"

import {mockOrderedQuery} from "src/test/mock"
import {QueryInitializer} from "../../server"
import {filter} from "./filter"

const _schema = defineSchema({
  user: defineTable({
    name: v.string(),
    age: v.number(),
  }),
})

type DataModel = DataModelFromSchemaDefinition<typeof _schema>
type TableNames = TableNamesInDataModel<DataModel>
type TableInfo<TableName extends TableNames> = NamedTableInfo<DataModel, TableName>

describe("filter", () => {
  test("should have correct type signature", () => {
    const query = mockOrderedQuery<TableInfo<"user">>()
    const actual = filter(query, () => true)

    expectTypeOf(actual).toEqualTypeOf<OrderedQuery<TableInfo<"user">>>()
  })

  it("should return a QueryInitializer instance", () => {
    const query = mockOrderedQuery<TableInfo<"user">>()

    const actual = filter(query, () => true)

    expect(actual).toBeInstanceOf(QueryInitializer)
  })
})
