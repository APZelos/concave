# UNIT_TESTING.md

Unit testing guide for the Concave codebase, optimized for LLM consumption.

## Test File Location

- Unit tests: `{module}.test.ts` alongside source
- Integration tests: `src/test/` directory

## Test Schema Boilerplate

Every test file testing database operations needs a local schema with derived types:

```typescript
import type {
  DataModelFromSchemaDefinition,
  DocumentByName,
  NamedTableInfo,
  TableNamesInDataModel,
} from "convex/server"
import type {GenericId} from "convex/values"

import {describe, expect, expectTypeOf, it, test, vi} from "@effect/vitest"
import {defineSchema, defineTable} from "convex/server"
import {v} from "convex/values"
import {Effect as E} from "effect"

const _schema = defineSchema({
  user: defineTable({
    name: v.string(),
  }),
})

type DataModel = DataModelFromSchemaDefinition<typeof _schema>
type TableNames = TableNamesInDataModel<DataModel>
type TableInfo<TableName extends TableNames> = NamedTableInfo<DataModel, TableName>
type Id<TableName extends TableNames> = GenericId<TableName>
type Doc<TableName extends TableNames> = DocumentByName<DataModel, TableName>
```

## Test Types

### Type Signature Tests (`test()`)

Use for compile-time type verification. No Effect generators.

```typescript
test("should have correct type signature", () => {
  const db = mockGenericDatabaseReader<DataModel>()
  const actual = db.get(mockGenericId("user", "user-id"))

  expectTypeOf(actual).toEqualTypeOf<E.Effect<Doc<"user"> | null, never, never>>()
})
```

### Effect Behavior Tests (`it.effect()`)

Use for runtime behavior verification with branching logic or transformations.

```typescript
it.effect("should return document when it exists", () =>
  E.gen(function* () {
    const doc: Doc<"user"> = {
      _id: mockGenericId("user", "user-id"),
      _creationTime: Date.now(),
      name: "Joe",
    }
    const db = mockGenericDatabaseReader<DataModel>({
      get: vi.fn().mockResolvedValue(doc),
    })

    const actual = yield* db.get(doc._id)

    expect(actual).toEqual(doc)
  }),
)
```

### Error Tests (`E.flip`)

Use `E.flip` to convert error channel to success for assertion:

```typescript
it.effect("should fail with FileNotFoundError when file does not exist", () =>
  E.gen(function* () {
    const storageId = mockGenericId("_storage", "file-id")
    const storage = mockStorageReader({
      getUrl: vi.fn().mockResolvedValue(null),
    })

    const result = yield* storage.getUrl(storageId).pipe(E.flip)

    expect(result).toBeInstanceOf(FileNotFoundError)
  }),
)
```

### Context Injection (`E.provideService`)

When testing code that requires context (QueryCtx, MutationCtx):

```typescript
const QueryCtx = createQueryCtx<DataModel>()

it.effect("should return id if value is valid", () =>
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
```

## Testing Error Branches

Methods with error paths need tests that trigger those errors. Use `E.flip` to assert on the error channel:

```typescript
describe("unique", () => {
  // Happy path
  it.effect("should return document for single result", () => /* ... */)

  // Error path - must also be tested
  it.effect("should fail with DocNotUniqueError for multiple documents", () =>
    E.gen(function* () {
      const docs = [mockDoc(), mockDoc()]  // Trigger error condition
      const stream = mockStream({take: vi.fn().mockResolvedValue(docs)})

      const error = yield* stream.unique().pipe(E.flip)

      expect(error).toBeInstanceOf(DocNotUniqueError)
    }),
  )
})
```

## Runtime Assertions for Type Safety

When mocks might return incorrect types at runtime, add runtime checks:

```typescript
it.effect("should return user document", () =>
  E.gen(function* () {
    const actual = yield* db.get(userId)

    // Runtime check that structure matches expectation
    expect(actual).toHaveProperty("name")
    expect(typeof actual?.name).toBe("string")
  }),
)
```

## Mocks

### Finding Mocks

Mocks are exported from `/testing` subpaths of each package. To discover available mocks:

1. Check existing test files for import patterns
2. Look at `src/testing/mock.ts` in each package
3. Use IDE autocomplete from the `/testing` export

Each package re-exports mocks from its dependencies, so import from the package most relevant to what you're testing.

### Naming Convention

- `mock{ClassName}` - Returns the Concave wrapper class (e.g., `mockGenericDatabaseReader`)
- `mockConvex{ClassName}` - Returns the raw Convex type (e.g., `mockConvexGenericDatabaseReader`)
- `mockGenericId(tableName, id)` - Creates type-safe IDs for testing

Use wrapper mocks when testing code that expects Concave types. Use raw Convex mocks only when testing the wrapper classes themselves.

### Override Pattern

All mocks accept partial overrides. Unmocked methods throw `MockNotImplementedError`:

```typescript
// Override specific methods
const db = mockGenericDatabaseReader<DataModel>({
  get: vi.fn().mockResolvedValue(doc),
})

// Nested overrides for context mocks
const ctx = mockGenericQueryCtx<DataModel>({
  db: mockConvexGenericDatabaseReader<DataModel>({
    normalizeId: vi.fn().mockReturnValue("user-id"),
  }),
})
```

## Anti-Patterns

### Testing Pure Delegation

```typescript
// BAD - Just verifies mock was called, type test already covers this
it.effect("should call underlying convexStream.collect", () =>
  E.gen(function* () {
    const collectMock = vi.fn().mockResolvedValue([])
    // ...
    expect(collectMock).toHaveBeenCalled()
  }),
)
```

### Mock Pass-Through Tests

```typescript
// BAD - Mock in, mock out - no logic tested
it.effect("should return documents", () =>
  E.gen(function* () {
    const docs = [mockDoc()]
    const stream = mockStream({collect: vi.fn().mockResolvedValue(docs)})
    const actual = yield* stream.collect()
    expect(actual).toEqual(docs)
  }),
)
```

### Empty/Null Case Duplicates

Don't write separate tests for empty arrays or null when the code path is identical to the non-empty case.

### Using toMatchTypeOf (Deprecated)

```typescript
// BAD
expectTypeOf(actual).toMatchTypeOf<Expected>()

// GOOD
expectTypeOf(actual).toEqualTypeOf<Expected>()
```

### Behavior Tests Without Logic

If the method just delegates without branching, transformation, or error logic, only write a type test.

## When to Write Behavior Tests

Write behavior tests when the method has:

- **Branching logic** (if/else, pattern matching)
- **Data transformation** (wrapping in Option, mapping values)
- **Error generation** (creating errors based on conditions)

Skip behavior tests for pure delegation - type tests already prove these work.

## When to Skip Unit Tests

### Integration Tests Are Better

- End-to-end flows with real database operations
- Testing handler → Convex runtime → database roundtrips

### Testing Convex Phantom Types

Convex's `RegisteredQuery`/`RegisteredMutation`/`RegisteredAction` have phantom type parameters (`Args` and `Returns`) that are declared but unused in the type structure. Standard `expectTypeOf().toEqualTypeOf<>()` assertions cannot extract these types.

**Solution: Assert Helpers**

The `@apzelos/concave-internal/assert` package provides helpers that use TypeScript's conditional type inference (`infer`) to extract phantom type parameters at compile time:

```typescript
import {
  expectTypeOfRegisteredActionArgs,
  expectTypeOfRegisteredActionReturns,
  expectTypeOfRegisteredMutationArgs,
  expectTypeOfRegisteredMutationReturns,
  expectTypeOfRegisteredQueryArgs,
  expectTypeOfRegisteredQueryReturns,
} from "@apzelos/concave-internal/assert"
```

**Co-location Pattern**

Type tests should be co-located with their related behavior tests, not in a separate "Type Tests" describe block:

```typescript
describe("without args", () => {
  it("should execute without args schema", async () => {
    const t = setup()
    // Type test co-located with related behavior test
    expectTypeOfRegisteredQueryArgs(queries.queryNoArgs).toEqualTypeOf<{}>()
    expectTypeOfRegisteredQueryReturns(queries.queryNoArgs).toEqualTypeOf<Promise<string>>()
    const result = await t.query(api.queries.queryNoArgs, {})
    expect(result).toBe("no args result")
  })
})
```

Co-location benefits:

- **Maintainability** - when adding a new handler, add both behavior and type tests in one place
- **Discoverability** - related tests are grouped together
- **Locality** - keeps related things close together

**Alternative Approaches:**

- Use integration tests with `FunctionReference` for runtime verification
- Test handler types directly via `E.Effect.Success<ReturnType<typeof handler>>`

## Running Tests

```bash
pnpm test           # Run all tests once
pnpm test:watch     # Watch mode
pnpm check         # Run typecheck, lint, prettier
```
