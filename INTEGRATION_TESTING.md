# INTEGRATION_TESTING.md

Integration testing guide for the Concave codebase, optimized for LLM consumption.

## Overview

Integration tests verify that **Concave packages** work correctly against a simulated Convex backend. Unlike unit tests that mock dependencies, integration tests use `convex-test` to simulate the actual Convex runtime.

**All integration tests live in `apps/integration-tests/`.**

### What We Test (and What We Don't)

These tests exist to verify our Concave packages behave correctly - they are **not** for testing Convex itself. Assume Convex works perfectly; it has its own thorough test suite and testing it is not our responsibility.

We use Convex operations as a **means to an end** - to verify our packages work correctly. For example:

- Verify data made it to the database correctly to ensure our wrappers pass data through properly
- Check query results to ensure our abstractions play correctly with Convex
- Use `t.run()` to inspect database state after mutations to verify our handlers behaved correctly

**Focus on testing:**

- Concave Effect handlers integrate correctly with Convex runtime
- Context injection (QueryCtx, MutationCtx, ActionCtx) works as expected
- Schema transformations between Effect Schema and Convex validators
- Error propagation from Effect handlers
- Cross-function calls via runQuery/runMutation/runAction
- Package-specific features (streams, filters, models)

**Avoid testing Convex itself:**

- Don't write tests just to verify Convex's insert/get/patch/delete work
- Don't test that Convex indexes return correct results in isolation
- Don't test Convex pagination mechanics
- Don't test that Convex auth works

The difference: "does our mutation handler correctly insert a record?" (test this) vs "does Convex's db.insert work?" (don't test this)

### When to Write Integration vs Unit Tests

| Test Type       | Use For                                                                         |
| --------------- | ------------------------------------------------------------------------------- |
| **Integration** | End-to-end handler flows, database roundtrips, cross-function calls, auth flows |
| **Unit**        | Type signatures, branching logic, data transformations, error generation        |

## Test Organization

### High-Level Structure

Integration tests are organized by the package being tested:

```
apps/integration-tests/
├── convex/                 # Convex functions used by tests
│   ├── schema.ts           # Shared test database schema
│   ├── concave.ts          # Concave setup (contexts, function factories)
│   └── functions/          # Test functions organized by feature
└── integration/            # Test files organized by package
    ├── {package-name}/     # Tests for @apzelos/{package-name}
    └── ...
```

### Organization Principles

1. **One directory per package** - Tests for `@apzelos/concave` go in `integration/concave/`, tests for `@apzelos/concave-helpers` go in `integration/helpers/`, etc.

2. **Test files mirror features** - Within each package directory, organize test files by the feature or capability being tested (queries, mutations, actions, storage, scheduler, etc.)

3. **Shared test functions** - Convex functions needed by tests live in `convex/functions/`, organized by the type of function (queries, mutations, etc.)

### Finding Existing Tests

To find existing integration tests for a feature:

- Search for test files in `apps/integration-tests/integration/` by feature name
- Look at existing test files in the relevant package directory for patterns
- Check `convex/functions/` for the Convex functions being tested

### Adding Tests for a New Package

1. Create a new directory under `integration/` matching the package name
2. Create test files organized by feature
3. Add any needed Convex functions to `convex/functions/`
4. Update the schema in `convex/schema.ts` if new tables are needed
5. Follow patterns from existing package test directories

## Core Testing Patterns

### Basic Test Pattern

```typescript
import {describe, expect, it} from "vitest"

import {api} from "../../convex/_generated/api"
import {setup} from "../../setup"

describe("Feature", () => {
  it("should do something", async () => {
    const t = setup() // Fresh test instance per test

    const result = await t.query(api.path.to.function, {arg: "value"})

    expect(result).toBe("expected")
  })
})
```

Always call `setup()` inside each test to get a fresh test instance with an empty database.

### Test Data Setup Best Practices

#### Prefer Self-Contained Tests

Each test should be readable on its own without needing to understand complex helper abstractions. Inline data setup when possible:

```typescript
// GOOD - self-contained, easy to understand
it("should filter by category", async () => {
  const t = setup()

  await t.run(async (ctx) => {
    await ctx.db.insert("items", {name: "Cat", category: "animals", status: "active"})
    await ctx.db.insert("items", {name: "Car", category: "vehicles", status: "active"})
  })

  const animals = await t.query(api.path.to.filterByCategory, {category: "animals"})
  expect(animals).toHaveLength(1)
})
```

#### Use `t.run()` for Direct Database Setup

The preferred approach for setting up test data is using `t.run()` with direct database access:

```typescript
const id = await t.run(async (ctx) => {
  return await ctx.db.insert("tableName", {
    field1: "value1",
    field2: "value2",
  })
})
```

#### When to Extract Helpers

Only extract helpers when there's significant repetition **within the same file**. Keep helpers:

- **Local to the file** - Do not share helpers across test files
- **Simple** - Avoid over-engineered abstractions with many parameters
- **Optional** - Question whether a helper is needed at all

```typescript
// GOOD - simple, local helper when needed multiple times in same file
async function createItem(t: ReturnType<typeof setup>, name: string, category: string) {
  return await t.run(async (ctx) => {
    return await ctx.db.insert("items", {
      name,
      category,
      status: "active",
      createdAt: Date.now(),
    })
  })
}

// BAD - over-generalized helper with too many options
async function createTestItem(
  t: ReturnType<typeof setup>,
  overrides: Partial<{name: string; category: string; status: string; priority: number; ...}> = {},
) {
  // Complex logic with many defaults...
}
```

#### When to Use Mutations vs `t.run()`

| Approach       | Use When                                                                 |
| -------------- | ------------------------------------------------------------------------ |
| `t.run()`      | Setting up preconditions, creating test fixtures, direct db manipulation |
| `t.mutation()` | Testing the mutation itself, verifying mutation behavior                 |

#### Test Isolation

Each `setup()` call creates a fresh, empty database - no manual cleanup needed:

```typescript
// GOOD - each test gets fresh state
it("test 1", async () => {
  const t = setup()
  // ...
})

it("test 2", async () => {
  const t = setup()
  // ...
})

// BAD - shared state between tests
const t = setup()
it("test 1", async () => {
  /* ... */
})
it("test 2", async () => {
  /* ... */
})
```

#### Storage Data Setup

For tests involving file storage:

```typescript
const storageId = await t.run(async (ctx) => {
  return await ctx.storage.store(new Blob(["file content"], {type: "text/plain"}))
})
```

### Authentication Testing

```typescript
// Unauthenticated test
it("should succeed when unauthenticated", async () => {
  const t = setup()
  const result = await t.query(api.path.to.publicFunction, {})
  expect(result).toBeDefined()
})

// Authenticated test
it("should succeed when authenticated", async () => {
  const t = setup()
  const authedT = t.withIdentity({
    name: "Test User",
    email: "test@example.com",
    tokenIdentifier: "test-token",
  })
  const result = await authedT.query(api.path.to.authFunction, {})
  expect(result.tokenIdentifier).toBe("test-token")
})

// Auth-required failure test
it("should fail when unauthenticated", async () => {
  const t = setup()
  await expect(t.query(api.path.to.authFunction, {})).rejects.toThrow()
})
```

### Database Operations Testing

Test patterns for common database operations:

```typescript
// Full table scan
const items = await t.query(api.path.to.fullScanQuery, {})
expect(items).toHaveLength(expectedCount)

// Index query
const filtered = await t.query(api.path.to.indexQuery, {fieldValue: "value"})
expect(filtered.every(item => item.field === "value")).toBe(true)

// Pagination
const firstPage = await t.query(api.path.to.paginatedQuery, {
  paginationOpts: {numItems: 10, cursor: null},
})
expect(firstPage.page).toHaveLength(10)
expect(firstPage.continueCursor).toBeDefined()

// CRUD operations via mutations
const id = await t.mutation(api.path.to.insertMutation, {data: {...}})
await t.mutation(api.path.to.patchMutation, {id, updates: {...}})
await t.mutation(api.path.to.deleteMutation, {id})
```

### Scheduler Testing (Fake Timers)

```typescript
import {afterEach, beforeEach, vi} from "vitest"

describe("Scheduler", () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it("should execute scheduled function", async () => {
    const t = setup()

    await t.mutation(api.path.to.scheduleMutation, {delayMs: 0})

    // Execute scheduled functions
    vi.runAllTimers()
    await t.finishInProgressScheduledFunctions()

    // Verify execution occurred
  })
})
```

### Storage Testing

```typescript
// Store file directly via t.run
const storageId = await t.run(async (ctx) => {
  return await ctx.storage.store(new Blob(["content"], {type: "text/plain"}))
})

// Get URL
const url = await t.query(api.path.to.getUrlQuery, {storageId})
expect(url).toBeDefined()

// Delete
await t.mutation(api.path.to.deleteMutation, {storageId})
```

### HTTP Actions Testing

```typescript
// GET request
const response = await t.fetch("/path", {method: "GET"})
expect(response.status).toBe(200)
const body = await response.json()

// POST request
const response = await t.fetch("/path", {
  method: "POST",
  body: JSON.stringify({data: "value"}),
  headers: {"Content-Type": "application/json"},
})
expect(response.status).toBe(201)

// Query parameters
const response = await t.fetch("/path?param=value", {method: "GET"})
```

### Error Testing

```typescript
// Test that errors propagate
await expect(t.query(api.path.to.errorFunction, {})).rejects.toThrow()

// Test specific error message
await expect(t.query(api.path.to.errorFunction, {message: "specific error"})).rejects.toThrow(
  "specific error",
)
```

## Effect Handler Patterns

Integration tests verify Effect handlers work correctly in the Convex runtime. To understand the handler patterns:

1. **Look at existing functions** in `convex/functions/` for examples
2. **Key patterns** to observe:
   - `E.fn(function* () {...})` generator syntax
   - `yield* ContextTag` for context access (QueryCtx, MutationCtx, ActionCtx)
   - `yield* db.operation()` for database operations
   - `yield* new TaggedError()` for error handling
   - `ctx.runQuery/runMutation/runAction` for cross-function calls

## Writing Test Functions (Convex Side)

### Concave Setup Pattern

Look at `convex/concave.ts` for the standard setup pattern:

- Create context tags with `createQueryCtx<DataModel>()`, etc.
- Create function factories with `createServerFunctions({...})`
- Export the context tags and function factories

### Adding New Test Functions

1. Add functions to the appropriate file in `convex/functions/`
2. Use the function factories from `convex/concave.ts`
3. Follow Effect handler patterns from existing functions
4. Ensure the schema has necessary tables/indexes

## Adding New Integration Tests

### Step 1: Identify What to Test

- New package feature or capability
- Bug fix that needs regression coverage
- Edge case not covered by unit tests

### Step 2: Locate or Create Test Infrastructure

- Find the package directory under `integration/`
- Check if needed Convex functions exist in `convex/functions/`
- Check if schema has required tables/indexes

### Step 3: Create Test Functions if Needed

Add Convex functions that exercise the feature being tested. Follow patterns from existing functions in `convex/functions/`.

### Step 4: Add Test Cases

Create or update test files following the patterns in this guide. Look at existing test files in the same package directory for conventions.

### Step 5: Run Tests

```bash
pnpm test                    # Run all tests
pnpm test -- --watch         # Watch mode
pnpm test -- <pattern>       # Run specific test file
```

## convex-test API Reference

| Method                                   | Description                             |
| ---------------------------------------- | --------------------------------------- |
| `convexTest(schema, modules)`            | Initialize test instance                |
| `t.query(api.path, args)`                | Call a query function                   |
| `t.mutation(api.path, args)`             | Call a mutation function                |
| `t.action(api.path, args)`               | Call an action function                 |
| `t.fetch(path, options)`                 | Test HTTP actions                       |
| `t.run(async (ctx) => {...})`            | Direct database/storage access          |
| `t.withIdentity({...})`                  | Add authentication identity             |
| `t.finishInProgressScheduledFunctions()` | Execute pending scheduled functions     |
| `t.finishAllScheduledFunctions()`        | Execute all chained scheduled functions |

### t.run Context

```typescript
await t.run(async (ctx) => {
  // Database access
  const id = await ctx.db.insert("table", {...})
  const doc = await ctx.db.get(id)
  await ctx.db.patch(id, {...})
  await ctx.db.delete(id)

  // Storage access
  const storageId = await ctx.storage.store(blob)
  const url = await ctx.storage.getUrl(storageId)
  await ctx.storage.delete(storageId)
})
```

### withIdentity Options

```typescript
t.withIdentity({
  name: "User Name",
  email: "user@example.com",
  tokenIdentifier: "unique-token-id",
  // Additional OpenID Connect claims...
})
```

## Limitations and Considerations

### convex-test Is a Mock

- Simulates Convex runtime but is not production behavior
- Error messages may differ from production
- Document limits not enforced
- Text search returns unranked results

### External HTTP

External `fetch` calls in actions may not work in the test environment. Use `it.skip()` for such tests.

### Cron Jobs

Cron jobs are not supported by convex-test. Test scheduled functions directly using scheduler methods.

### Auth Providers

Only mock identity injection is available. Real auth provider integration cannot be tested in this environment.

## Testing Convex Phantom Types

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

import * as queries from "../../convex/functions/queries"
```

**Co-location Pattern**

Type tests should be co-located with their related behavior tests, not in a separate "Type Tests" describe block:

```typescript
describe("fullTableScan", () => {
  it("should return all documents", async () => {
    const t = setup()
    expectTypeOfRegisteredQueryArgs(queries.queryFullTableScan).toEqualTypeOf<{}>()
    expectTypeOfRegisteredQueryReturns(queries.queryFullTableScan).toEqualTypeOf<
      Promise<Doc<"items">[]>
    >()
    // ... behavior test setup and assertions
  })
})
```

Co-location benefits:

- **Maintainability** - when adding a new handler, add both behavior and type tests in one place
- **Discoverability** - related tests are grouped together
- **Locality** - keeps related things close together

**Note:** Type tests use `test()` blocks (not `it.effect()`) since they're compile-time only and don't need async execution.

## Running Tests

```bash
pnpm test                    # Run all tests once
pnpm test:watch              # Watch mode for development
pnpm checks                  # Run typecheck, lint, prettier check
```

## Finding More Information

- **Existing test patterns**: Browse `apps/integration-tests/integration/` directories
- **Convex function patterns**: Browse `apps/integration-tests/convex/functions/`
- **Schema structure**: Read `apps/integration-tests/convex/schema.ts`
- **Setup configuration**: Read `apps/integration-tests/setup.ts` and `vitest.config.ts`
- **convex-test documentation**: Refer to convex-test package docs
