# Concave Handler Patterns

Pattern reference for `@apzelos/concave` - Effect wrappers for Convex.

---

## Handler Structure

```typescript
import {SDocId} from "@apzelos/concave/server"
import {Effect as E, Schema as S} from "effect"

export const getUser = query({
  args: S.Struct({id: SDocId("users")}),
  returns: S.NullOr(
    S.Struct({
      name: S.NonEmptyString,
      email: S.NonEmptyString,
    }),
  ),
  handler: E.fn(function* (args) {
    const {db} = yield* QueryCtx
    return yield* db.get(args.id)
  }),
})
```

---

## Concave Utilities

### SDocId

Type-safe document ID schema for Convex tables:

```typescript
import {SDocId} from "@apzelos/concave/server"

args: S.Struct({
  id: SDocId("users"),
  storageId: SDocId("_storage"),
  scheduledId: SDocId("_scheduled_functions"),
})
```

### SPaginationResult

```typescript
import {SPaginationResult} from "@apzelos/concave/server"

returns: SPaginationResult(
  S.Struct({
    name: S.NonEmptyString,
    email: S.NonEmptyString,
  }),
)
```

---

## Schema Patterns

### Args with Validation

```typescript
// Branded type for type-safe IDs
const Email = S.NonEmptyString.pipe(S.pattern(/^[^@]+@[^@]+\.[^@]+$/), S.brand("Email"))

export const createUser = mutation({
  args: S.Struct({
    name: S.NonEmptyTrimmedString,
    email: Email,
    age: S.Number.pipe(S.int(), S.positive()),
    role: S.optionalWith(S.Literal("admin", "user"), {default: () => "user" as const}),
    bio: S.optional(S.String.pipe(S.maxLength(500))),
  }),
  handler: E.fn(function* (args) {
    const {db} = yield* MutationCtx
    return yield* db.insert("users", args)
  }),
})
```

### Wire Transformations

```typescript
export const getEvents = query({
  args: S.Struct({
    after: S.DateFromString, // "2024-01-01" -> Date
    limit: S.NumberFromString, // "10" -> 10
  }),
  handler: E.fn(function* (args) {
    const {db} = yield* QueryCtx
    return yield* db
      .query("events")
      .withIndex("by_date", (q) => q.gt("date", args.after.getTime()))
      .take(args.limit)
  }),
})
```

---

## Tagged Errors

`Data.TaggedError` instances are yieldable directly - no need for `E.fail()`:

```typescript
import {DocNotFoundError, FileNotFoundError} from "@apzelos/concave/server"
import {Data} from "effect"

export class NotAuthenticatedError extends Data.TaggedError("NotAuthenticatedError") {}

export class ValidationError extends Data.TaggedError("ValidationError")<{
  field: string
  message: string
}> {}

export const getProfile = query({
  args: S.Struct({id: SDocId("users")}),
  handler: E.fn(function* (args) {
    const {auth, db, storage} = yield* QueryCtx

    const identity = yield* auth.getUserIdentity()
    if (!identity) {
      return yield* new NotAuthenticatedError()
    }

    const user = yield* db.get(args.id)
    if (!user) {
      return yield* new DocNotFoundError({tableName: "users"})
    }

    // Handle multiple error types with catchTags
    const avatarUrl = yield* storage.getUrl(user.avatarId).pipe(
      E.catchTags({
        FileNotFoundError: () => E.succeed(null),
      }),
    )

    return {...user, avatarUrl}
  }),
})
```

---

## Type-Safe Cross-Function Calls

Annotate the Effect type for proper inference:

```typescript
import type {Id} from "../_generated/dataModel"

import {internal} from "../_generated/api"

export const processOrder = action({
  args: S.Struct({orderId: SDocId("orders")}),
  handler: E.fn(function* (args) {
    const ctx = yield* ActionCtx

    const Eorder: E.Effect<{total: number; userId: Id<"users">} | null> = ctx.runQuery(
      internal.orders.getById,
      {id: args.orderId},
    )
    const order = yield* Eorder

    if (!order) {
      return yield* new DocNotFoundError({tableName: "orders"})
    }

    const Eresult: E.Effect<{success: boolean}> = ctx.runMutation(internal.orders.markProcessed, {
      id: args.orderId,
    })
    return yield* Eresult
  }),
})
```

---

## HTTP Action Patterns

### Parsing Request Body

```typescript
import {HttpActionCtx} from "@apzelos/concave/server"

export class RequestParseError extends Data.TaggedError("RequestParseError")<{
  message: string
  cause?: unknown
}> {}

const CreateUserBody = S.Struct({
  name: S.NonEmptyTrimmedString,
  email: S.NonEmptyString.pipe(S.pattern(/^[^@]+@[^@]+\.[^@]+$/)),
})

http.route({
  path: "/api/users",
  method: "POST",
  handler: httpAction(
    E.fn(function* (request: Request) {
      const body = yield* E.tryPromise({
        try: () => request.json() as Promise<unknown>,
        catch: (error) => new RequestParseError({message: "Invalid JSON", cause: error}),
      }).pipe(
        E.flatMap(S.decodeUnknown(CreateUserBody)),
        E.mapError((e) => new RequestParseError({message: "Validation failed", cause: e})),
      )

      const ctx = yield* HttpActionCtx
      const Eid: E.Effect<Id<"users">> = ctx.runMutation(internal.users.create, body)
      const id = yield* Eid

      return new Response(JSON.stringify({id}), {
        status: 201,
        headers: {"Content-Type": "application/json"},
      })
    }),
  ),
})
```

### Parsing Query Parameters

```typescript
http.route({
  path: "/api/items",
  method: "GET",
  handler: httpAction(
    E.fn(function* (request: Request) {
      const url = new URL(request.url)

      const params = yield* E.try({
        try: () =>
          S.decodeUnknownSync(
            S.Struct({
              page: S.optionalWith(S.NumberFromString, {default: () => 1}),
              limit: S.optionalWith(S.NumberFromString, {default: () => 10}),
              search: S.optional(S.NonEmptyString),
            }),
          )({
            page: url.searchParams.get("page") ?? undefined,
            limit: url.searchParams.get("limit") ?? undefined,
            search: url.searchParams.get("search") ?? undefined,
          }),
        catch: (e) => new RequestParseError({message: "Invalid parameters", cause: e}),
      })

      const ctx = yield* HttpActionCtx
      const items = yield* ctx.runQuery(internal.items.list, params)

      return new Response(JSON.stringify(items), {
        status: 200,
        headers: {"Content-Type": "application/json"},
      })
    }),
  ),
})
```

---

## Effect Composition

```typescript
export const getUserWithPosts = query({
  args: S.Struct({userId: SDocId("users")}),
  handler: E.fn(function* (args) {
    const {db} = yield* QueryCtx

    // andThen - flexible chaining (accepts values, Effects, or functions)
    const user = yield* db
      .get(args.userId)
      .pipe(E.andThen((doc) => (doc ? E.succeed(doc) : new DocNotFoundError({tableName: "users"}))))

    // flatMap - for chaining Effects
    const posts = yield* db
      .query("posts")
      .withIndex("by_author", (q) => q.eq("authorId", user._id))
      .collect()
      .pipe(
        E.flatMap((posts) =>
          E.all(
            posts.map((post) =>
              db
                .get(post.categoryId)
                .pipe(E.andThen((cat) => ({...post, category: cat?.name ?? "Uncategorized"}))),
            ),
          ),
        ),
      )

    // tap - for side effects without changing value
    yield* E.tap(E.logInfo(`Fetched ${posts.length} posts for user ${user._id}`))

    return {user, posts}
  }),
})
```

---

## Context Services Matrix

| Service                     | QueryCtx | MutationCtx | ActionCtx |
| --------------------------- | -------- | ----------- | --------- |
| `auth`                      | ✓        | ✓           | ✓         |
| `db` (read)                 | ✓        | ✓           | -         |
| `db` (write)                | -        | ✓           | -         |
| `storage.getUrl`            | ✓        | ✓           | ✓         |
| `storage.generateUploadUrl` | -        | ✓           | ✓         |
| `storage.delete`            | -        | ✓           | ✓         |
| `storage.get`               | -        | -           | ✓         |
| `storage.store`             | -        | -           | ✓         |
| `scheduler`                 | -        | ✓           | ✓         |
| `runQuery`                  | ✓        | ✓           | ✓         |
| `runMutation`               | -        | ✓           | ✓         |
| `runAction`                 | -        | -           | ✓         |
| `vectorSearch`              | -        | -           | ✓         |

---

## Setup

`convex/concave.ts`:

```typescript
import type {DataModel} from "./_generated/dataModel"

import {
  createActionCtx,
  createMutationCtx,
  createQueryCtx,
  createServerFunctions,
} from "@apzelos/concave/server"

export const QueryCtx = createQueryCtx<DataModel>()
export const MutationCtx = createMutationCtx<DataModel>()
export const ActionCtx = createActionCtx<DataModel>()

export const {
  query,
  internalQuery,
  mutation,
  internalMutation,
  action,
  internalAction,
  httpAction,
} = createServerFunctions({QueryCtx, MutationCtx, ActionCtx})
```

---

## Anti-Patterns

### Missing yield\*

```typescript
// WRONG - doc is Effect, not document
const doc = db.get(args.id)

// CORRECT
const doc = yield * db.get(args.id)
```

### Returning Effect instead of value

```typescript
// WRONG
return E.succeed(data)

// CORRECT
return data
```

### Wrapping TaggedError in E.fail

```typescript
// UNNECESSARY
return yield * E.fail(new NotAuthenticatedError())

// CORRECT - TaggedErrors are yieldable
return yield * new NotAuthenticatedError()
```

### Missing type annotation on cross-function calls

```typescript
// WRONG - loses type information
const user = yield * ctx.runQuery(internal.users.get, {id})

// CORRECT
const Euser: E.Effect<User | null> = ctx.runQuery(internal.users.get, {id})
const user = yield * Euser
```

### Using S.Date in args/returns

```typescript
// WRONG - Date not JSON-serializable
args: S.Struct({date: S.Date})

// CORRECT
args: S.Struct({date: S.DateFromString})
```

### Chaining multiple catchTag calls

```typescript
// VERBOSE
yield *
  effect.pipe(
    E.catchTag("ErrorA", () => E.succeed(null)),
    E.catchTag("ErrorB", () => E.succeed(null)),
  )

// BETTER
yield *
  effect.pipe(
    E.catchTags({
      ErrorA: () => E.succeed(null),
      ErrorB: () => E.succeed(null),
    }),
  )
```

### Using raw primitives without validation

```typescript
// WEAK
args: S.Struct({
  email: S.String,
  age: S.Number,
})

// BETTER
args: S.Struct({
  email: S.NonEmptyString.pipe(S.pattern(/^[^@]+@[^@]+$/)),
  age: S.Number.pipe(S.int(), S.positive()),
})
```

### Confusing S.decodeUnknown with S.decodeUnknownSync

```typescript
// WRONG - decodeUnknown returns Effect
const data = S.decodeUnknown(MySchema)(input)

// CORRECT - yield the Effect
const data = yield * S.decodeUnknown(MySchema)(input)

// OR use Sync with E.try
const data =
  yield *
  E.try({
    try: () => S.decodeUnknownSync(MySchema)(input),
    catch: (e) => new ParseError({cause: e}),
  })
```
