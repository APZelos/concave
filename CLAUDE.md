# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Concave** is an npm library (`@apzelos/concave`) that integrates the Effect functional programming library with Convex backend services. It provides type-safe, composable abstractions over Convex's database operations, auth, storage, and scheduling using Effect's functional programming paradigm.

## Build/Test/Lint Commands

```bash
pnpm test                           # Run tests with vitest (watch mode)
pnpm test -- --run                  # Run tests once
pnpm test -- src/server/auth.test.ts  # Run single test file
pnpm build                          # Build with tsup
pnpm typecheck                      # Type check with tsc
pnpm lint                           # Lint with eslint
pnpm checks                         # Run typecheck, lint, and prettier check
pnpm format                         # Format code with prettier
```

## Architecture

### Core Module Structure

- **`src/server/`** - Core Effect wrappers for Convex services
  - `context.ts` - QueryCtx, MutationCtx, ActionCtx classes and factory functions
  - `database.ts` - GenericDatabaseReader/Writer wrapping Convex database operations
  - `query.ts` - QueryInitializer, OrderedQuery, Query for building queries
  - `server.ts` - `createServerFunctions()` factory for Effect-based handlers
  - `error.ts` - Typed errors (DocNotFoundError, DocNotUniqueError, etc.)
  - `values.ts` - Schema/validator bridge between Effect Schema and Convex

- **`src/model/`** - Schema-based model generation with `createModelFunction()`

- **`src/helpers/server/`** - Stream query helpers (stream.ts) and filter utilities

- **`src/lib/types/`** - Advanced TypeScript utilities (IsAny, IsUnion, SafeUnion, etc.)

### Key Patterns

**Effect Handler Pattern:**
```typescript
const handler = E.fn(function* (args) {
  const {db} = yield* QueryCtx  // Dependency injection via Context
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
- Mock utilities in `src/test/mock.ts`

**For writing tests, use the skill at `.claude/skills/test.md`** - it contains comprehensive patterns for test structure, mocking, Effect testing, error testing with `E.flip`, and context injection with `E.provideService()`.

## Important Constraints

See AGENTS.md for detailed Convex-specific restrictions. Key points:
- Convex functions cannot return Effect types (must be JSON-serializable)
- Use `E.runPromise()` at Convex function boundaries
- Queries are read-only; only mutations/actions can write
- Only actions can make external HTTP requests
- Auth returns `null` in scheduled functions
