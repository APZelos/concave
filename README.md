# Concave

Effect-based integration library for [Convex](https://convex.dev) backend services.

Concave provides type-safe, composable abstractions over Convex's database operations, auth, storage, and scheduling using the [Effect](https://effect.website) functional programming library.

## Packages

| Package                                                  | Description                               |
| -------------------------------------------------------- | ----------------------------------------- |
| [`@apzelos/concave`](./packages/concave)                 | Core Effect wrappers for Convex services  |
| [`@apzelos/concave-helpers`](./packages/concave-helpers) | Stream query helpers and filter utilities |
| [`@apzelos/concave-model`](./packages/concave-model)     | Schema-based model generation             |
| `@apzelos/concave-internal`                              | Private shared utilities (not published)  |

## Installation

```bash
# Core package
npm install @apzelos/concave effect convex

# With helpers (requires convex-helpers)
npm install @apzelos/concave-helpers convex-helpers

# With model generation
npm install @apzelos/concave-model
```

## Quick Start

```typescript
import {createMutationCtx, createQueryCtx, createServerFunctions} from "@apzelos/concave"
import {Effect as E} from "effect"

// Create context tags for your data model
const QueryCtx = createQueryCtx<DataModel>()
const MutationCtx = createMutationCtx<DataModel>()

// Create Effect-based server functions
const {query, mutation} = createServerFunctions({QueryCtx, MutationCtx})

// Define a query using Effect generators
export const getUser = query(
  E.fn(function* (args: {userId: Id<"users">}) {
    const {db} = yield* QueryCtx
    const user = yield* db.get(args.userId)
    return user
  }),
)

// Define a mutation
export const createUser = mutation(
  E.fn(function* (args: {name: string}) {
    const {db} = yield* MutationCtx
    const userId = yield* db.insert("users", {name: args.name})
    return userId
  }),
)
```

## Development

### Prerequisites

- Node.js 18+
- pnpm 9+

### Setup

```bash
# Clone the repository
git clone https://github.com/apzelos/concave.git
cd concave

# Install dependencies
pnpm install

# Build all packages
pnpm build
```

### Commands

| Command          | Description                             |
| ---------------- | --------------------------------------- |
| `pnpm build`     | Build all packages                      |
| `pnpm dev`       | Watch mode for development              |
| `pnpm test`      | Run tests in watch mode                 |
| `pnpm test:run`  | Run tests once                          |
| `pnpm typecheck` | Type check all packages                 |
| `pnpm lint`      | Lint all packages                       |
| `pnpm checks`    | Run typecheck, lint, and prettier check |
| `pnpm format`    | Format code with prettier               |
| `pnpm clean`     | Clean all build artifacts               |

### Testing

Tests use [@effect/vitest](https://github.com/Effect-TS/effect/tree/main/packages/vitest) with edge-runtime environment.

```bash
# Run all tests
pnpm test

# Run tests once
pnpm test:run

# Run specific test file
pnpm test -- packages/concave/src/database.test.ts
```

Each package provides testing utilities:

```typescript
// Core mocks

// Helpers mocks (includes core)
import {mockStreamQueryCtx} from "@apzelos/concave-helpers/testing"
// Model mocks (includes all)
import {mockQueryCtx, mockStreamQueryCtx} from "@apzelos/concave-model/testing"
import {mockMutationCtx, mockQueryCtx} from "@apzelos/concave/testing"
```

## Publishing

This project uses [Changesets](https://github.com/changesets/changesets) for version management and publishing.

### Creating a Changeset

When you make changes that should be released, create a changeset:

```bash
pnpm changeset
```

This will prompt you to:

1. Select which packages have changed
2. Choose the semver bump type (major/minor/patch)
3. Write a summary of the changes

### Versioning

When ready to release, version the packages based on accumulated changesets:

```bash
pnpm version-packages
```

This updates package versions and changelogs based on the changesets.

### Publishing to npm

After versioning, publish to npm:

```bash
pnpm release
```

This will:

1. Build all packages
2. Publish changed packages to npm

Note: `@apzelos/concave-internal` is excluded from publishing as it's bundled into consuming packages.

### CI/CD

The repository includes GitHub Actions workflows:

- **CI** (`.github/workflows/ci.yml`): Runs on all PRs and pushes
  - Installs dependencies
  - Runs typecheck, lint, and tests

- **Release** (`.github/workflows/release.yml`): Runs on pushes to main
  - Creates a "Version Packages" PR when changesets are present
  - Publishes to npm when the PR is merged

## License

ISC
