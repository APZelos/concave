# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Concave** is a monorepo containing npm packages that integrate the Effect functional programming library with Convex backend services. It provides type-safe, composable abstractions over Convex's database operations, auth, storage, and scheduling using Effect's functional programming paradigm.

### Packages

- **`@apzelos/concave`** - Core Effect wrappers for Convex services
- **`@apzelos/concave-helpers`** - Stream query helpers and filter utilities (requires `convex-helpers`)
- **`@apzelos/concave-model`** - Schema-based model generation
- **`@apzelos/concave-internal`** - Private shared utilities (bundled into consuming packages)

## Build/Test/Lint Commands

```bash
pnpm test                           # Run all tests once (unit + integration)
pnpm test:watch                     # Run tests in watch mode
pnpm build                          # Build all packages with turbo
pnpm typecheck                      # Type check all packages
pnpm lint                           # Lint all packages
pnpm checks                         # Run typecheck, lint, and prettier check
pnpm format                         # Format code with prettier
pnpm changeset                      # Create a changeset for versioning
pnpm version-packages              # Version packages based on changesets
pnpm release                        # Build and publish packages
```

## Architecture

### Package Structure

- **`packages/concave/`** - Core Effect wrappers for Convex services
  - `src/context.ts` - QueryCtx, MutationCtx, ActionCtx classes and factory functions
  - `src/database.ts` - GenericDatabaseReader/Writer wrapping Convex database operations
  - `src/query.ts` - QueryInitializer, OrderedQuery, Query for building queries
  - `src/server.ts` - `createServerFunctions()` factory for Effect-based handlers
  - `src/error.ts` - Typed errors (DocNotFoundError, DocNotUniqueError, etc.)
  - `src/values.ts` - Schema/validator bridge between Effect Schema and Convex
  - `src/testing/` - Core mock utilities

- **`packages/helpers/`** - Stream and filter utilities
  - `src/server/stream.ts` - Stream query helpers
  - `src/server/filter.ts` - Filter utilities
  - `src/testing/` - Stream mock utilities

- **`packages/model/`** - Schema-based model generation
  - `src/model.ts` - `createModelFunction()` and related types

- **`packages/internal/`** - Private shared utilities (not published)
  - `src/types/` - Advanced TypeScript utilities (IsAny, IsUnion, SafeUnion, etc.)
  - `src/option.ts` - Option helpers

### Key Patterns

**Effect Handler Pattern:**

```typescript
const handler = E.fn(function* (args) {
  const {db} = yield* QueryCtx // Dependency injection via Context
  const doc = yield* db.get(id)
  return doc
})
```

**Context Injection:**

- `createQueryCtx<DataModel>()`, `createMutationCtx<DataModel>()`, `createActionCtx<DataModel>()` create Context tags
- Services provided via `E.provideService()` at boundaries
- Access inside handlers with `yield* ContextTag`

**Database Operations:**

- All operations return `Effect<T, E, never>` with typed errors
- `db.get(id)` returns `Effect<Doc | null>`, use Option helpers
- Query building: `db.query(table).withIndex(...).filter(...).collect()`

## Code Style

- No semicolons, 2 spaces, no bracket spacing
- Max line length: 100 chars (prettier), 120 chars (eslint)
- Use function declarations, not arrow functions
- Type imports with `type` keyword: `import type {Foo} from "bar"`
- Prefix unused variables with `_`
- Functions returning promises must be `async`

## Testing

Uses `@effect/vitest` with edge-runtime environment:

- `test()` for type signature validation with `expectTypeOf()`
- `it.effect()` for Effect-based tests using `E.gen()` generators
- Test files alongside source: `module.test.ts`
- Mock utilities layered by package:
  - `@apzelos/concave/testing` - Core mocks (contexts, database)
  - `@apzelos/concave-helpers/testing` - Re-exports core + stream mocks
  - `@apzelos/concave-model/testing` - Re-exports all mocks

**For writing tests, use the skill at `.claude/skills/test.md`** - it contains comprehensive patterns for test structure, mocking, Effect testing, error testing with `E.flip`, and context injection with `E.provideService()`.

## Important Constraints

See AGENTS.md for detailed Convex-specific restrictions. Key points:

- Convex functions cannot return Effect types (must be JSON-serializable)
- Use `E.runPromise()` at Convex function boundaries
- Queries are read-only; only mutations/actions can write
- Only actions can make external HTTP requests
- Auth returns `null` in scheduled functions
