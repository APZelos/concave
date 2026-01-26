# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Concave is an Effect-based integration library for Convex backend services. It provides type-safe, composable abstractions over Convex's database operations, auth, storage, and scheduling using the Effect functional programming library.

## Monorepo Structure

```
packages/
├── concave/          # Core Effect wrappers (@apzelos/concave)
├── concave-helpers/  # Stream query helpers and filter utilities (@apzelos/concave-helpers)
├── model/            # Schema-based model generation (@apzelos/concave-model)
└── concave-internal/ # Shared utilities (not published, bundled into consumers)
apps/
└── integration-tests/ # End-to-end tests against simulated Convex backend
```

## Documentation Reference

- **HANDLER_PATTERNS.md** — Best practices, patterns, anti-patterns and examples of how to write query, mutation, action and http action handlers using Effect [Schema, validation, TaggedError, context, E.fn, yield, generators, SDocId, catchTags]
- **UNIT_TESTING.md** — Best practices, patterns, anti-patterns and examples of how to write unit tests for testing the functionality of the concave packages [mocks, mockQueryCtx, it.effect, E.flip, vitest, expectTypeOf]
- **INTEGRATION_TESTING.md** — Best practices, patterns, anti-patterns and examples of how to write integration tests for testing the functionality of the concave packages [convex-test, setup, t.run, t.query, t.mutation, withIdentity, database]

## Package Manager

This repo uses **pnpm** exclusively. Always use `pnpm` and `pnpx` instead of `npm`/`npx` or `yarn`.

## After Making Changes

Run these commands in order after making code changes. Fix any issues before proceeding to next steps.

1. `pnpm format` — Format all files with Prettier
2. `pnpm checks` — Run typecheck, lint, and prettier check
3. `pnpm test` — Run the test suite

# IMPORTANT NOTES

- When exploring/studying the code don't read the dist/, always look at the actual implementation
- Always run all tests and not specific tests, otherwise there is the danger of missing something that broke. The `pnpm test` command runs all test, unit and integration, and it's pretty fast
