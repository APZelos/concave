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

## Handler Type Selection

Choose the appropriate handler type based on what the operation does:

| Handler      | Use When                                                           |
| ------------ | ------------------------------------------------------------------ |
| `query`      | Read-only operations (fetching data, searches, lookups)            |
| `mutation`   | Write operations (create, update, delete)                          |
| `action`     | External calls (APIs, file storage) or operations that can't retry |
| `httpAction` | HTTP endpoints (webhooks, REST APIs, custom routes)                |

**Key considerations:**

- Queries are cached and can retry safely - use for all read operations
- Mutations are transactional - use for any database writes
- Actions run outside the transaction and cannot be retried automatically - use only when necessary (external HTTP calls, Convex storage operations)

---

## Essential Utilities

Always use these utilities instead of raw primitives for type safety.

### SDocId

Type-safe document ID schema - use instead of raw `S.String` for document references:

```typescript
import {SDocId} from "@apzelos/concave/server"

args: S.Struct({
  id: SDocId("users"),
  storageId: SDocId("_storage"),
  scheduledId: SDocId("_scheduled_functions"),
})
```

### SPaginationResult

Schema for paginated results:

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

TypeScript cannot infer return types through Convex's `runQuery`/`runMutation` wrappers, so explicit type annotation is required to preserve type safety:

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

Key principles for HTTP actions:

- Validate all external input at system boundaries
- Use Schema for structured parsing of body and query params
- Wrap parsing errors in domain-specific TaggedErrors

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

const ListParams = S.Struct({
  page: S.optionalWith(S.NumberFromString, {default: () => 1}),
  limit: S.optionalWith(S.NumberFromString, {default: () => 10}),
  search: S.optional(S.NonEmptyString),
})

// POST with body parsing
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

// GET with query param parsing
http.route({
  path: "/api/items",
  method: "GET",
  handler: httpAction(
    E.fn(function* (request: Request) {
      const url = new URL(request.url)
      const params = yield* E.try({
        try: () =>
          S.decodeUnknownSync(ListParams)({
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

### Yield Directly in Pipe

When piping from an Effect, you can yield it directly inside `pipe`:

```typescript
// Option A - intermediate variable (useful for debugging or complex pipelines)
const q = yield * db.query("items")
return yield * pipe(q, someTransform, anotherTransform)

// Option B - inline yield (concise for simple transforms)
return yield * pipe(yield * db.query("items"), someTransform, anotherTransform)
```

Prefer inline yields for simple transforms; use intermediate variables when debugging or when the pipeline is complex.

### Transform Option Results in Pipe

Use `E.andThen` to transform Option results directly in the pipe:

```typescript
// Option A - intermediate variable
const result = yield * db.query("items").first()
return Option.getOrNull(result)

// Option B - inline with E.andThen
return yield * db.query("items").first().pipe(E.andThen(Option.getOrNull))
```

---

## Model Patterns

`@apzelos/concave-model` adds schema validation and typed errors on top of Convex operations.

### Choosing Your Error Strategy

Most model operations come in three variants. Choose based on how you want to handle the "not found" case:

| Variant    | Returns       | Use When                                         |
| ---------- | ------------- | ------------------------------------------------ |
| `strict`   | `T` or throws | Missing data is a bug - fail fast                |
| `Nullable` | `T \| null`   | Missing data is normal - handle inline           |
| `Option`   | `Option<T>`   | You want to chain transformations with `Option.` |

```typescript
// Strict: "This document MUST exist, crash if it doesn't"
const user = yield * User.getById(id)

// Nullable: "It might not exist, I'll handle null"
const user = yield * User.getByIdNullable(id)
if (!user) return {error: "User not found"}

// Option: "I want to transform the result functionally"
return (
  yield *
  pipe(
    User.getByIdOption(id),
    E.andThen(Option.map((u) => u.name)),
    E.andThen(Option.getOrElse(() => "Anonymous")),
  )
)
```

**Key insight**: Use the strict variant by default. Only use `Nullable`/`Option` when absence is a valid business case, not an error.

### Typed Errors as Control Flow

Model operations throw typed errors (`DocNotFoundError`, `InvalidDocIdError`, `DocNotUniqueError`) that you can catch selectively. This lets you handle specific failures without try/catch:

```typescript
// Provide a fallback for missing documents
const user =
  yield *
  pipe(
    User.getById(id),
    E.catchTag("DocNotFoundError", () => E.succeed(defaultUser)),
  )

// Convert invalid IDs to null instead of crashing
const validId =
  yield *
  pipe(
    User.normalizeId(untrustedInput),
    E.catchTag("InvalidDocIdError", () => E.succeed(null)),
  )
```

**Key insight**: Typed errors make error handling explicit in the type system. You can see what can fail and decide how to handle each case.

### Always Index Before Ordering

Both queries and streams require an index before ordering. This makes explicit which index is being traversed. If you just want to order by insertion time, use Convex's default `by_creation_time` index:

**Queries (raw Convex):**

```typescript
// WRONG - implicit ordering is unclear
const items = yield * db.query("items").order("asc").collect()

// CORRECT - explicit index
const items = yield * db.query("items").withIndex("by_creation_time").order("asc").collect()
```

**Queries (with Model):**

```typescript
// WRONG - ordering without index
yield * pipe(yield * Item.query, Item.order("asc"), Item.collect)

// CORRECT - specify the index first
yield *
  pipe(yield * Item.query, Item.withIndex("by_creation_time"), Item.order("asc"), Item.collect)
```

**Streams (with Model):**

```typescript
// WRONG - streams need an index
yield * pipe(yield * Item.stream, Item.orderStream("asc"), Item.collectStream)

// CORRECT - specify the index first
yield *
  pipe(
    yield * Item.stream,
    Item.withStreamIndex("by_creation_time"),
    Item.orderStream("asc"),
    Item.collectStream,
  )
```

**Key insight**: Always specify the index explicitly. Use `by_creation_time` when you want to order by insertion time. This makes the code self-documenting about which index is being traversed.

### When to Use Streams vs Queries

- **Queries** (`Item.query`): Standard Convex queries. Use for most cases.
- **Streams** (`Item.stream`): For effectful filtering/mapping where you need to do async work per document (like looking up related data).

```typescript
// Stream with effectful filter - check related data for each item
yield *
  pipe(
    yield * Item.stream,
    Item.withStreamIndex("by_category", (q) => q.eq("category", "active")),
    Item.filterStreamWith((item) =>
      E.gen(function* () {
        const details = yield* Detail.getByIdNullable(item.detailId)
        return details?.isValid ?? false
      }),
    ),
    Item.collectStream,
  )
```

### Stream Transformations

When transforming stream documents to a different shape, use model helpers for the first transformation (they decode the document), then generic curried helpers for subsequent transformations:

```typescript
import {collectStream, filterStreamWith, mapStream} from "@apzelos/concave-helpers/server/stream"

// Chained transformations - model helper first, then generic helpers
yield *
  pipe(
    yield * Item.stream,
    Item.withStreamIndex("by_creation_time"),
    Item.orderStream("asc"),
    Item.mapStream((item) => E.succeed({name: item.name, value: item.value})), // Model helper decodes
    mapStream((item) => E.succeed({...item, name: item.name.toUpperCase()})), // Generic helper
    mapStream((item) => E.succeed({...item, label: `Item: ${item.name}`})),
    collectStream,
  )

// Map -> filter -> map pipeline
yield *
  pipe(
    yield * Item.stream,
    Item.withStreamIndex("by_creation_time"),
    Item.orderStream("asc"),
    Item.mapStream((item) => E.succeed({id: item._id, doubled: item.value * 2})),
    filterStreamWith((item) => E.succeed(item.doubled >= minValue)),
    mapStream((item) => E.succeed({...item, label: `Value: ${item.doubled}`})),
    collectStream,
  )
```

**Key insight**: After the first `Item.mapStream`, the type is no longer the decoded document type. Use `mapStream`/`filterStreamWith`/`collectStream` from `@apzelos/concave-helpers/server/stream` for subsequent transformations.

### Effectful Maps with DB Lookups

Use `E.fn` when your map function needs to yield Effects (for DB lookups or errors):

```typescript
// Look up related data in map
yield *
  pipe(
    yield * Detail.stream,
    Detail.withStreamIndex("by_item"),
    Detail.orderStream("asc"),
    Detail.mapStream(
      E.fn(function* (detail) {
        const item = yield* Item.getByIdNullable(detail.itemId)
        return {detailInfo: detail.info, itemName: item?.name ?? "Unknown"}
      }),
    ),
    collectStream,
  )

// Nested query in map
yield *
  pipe(
    yield * Item.stream,
    Item.withStreamIndex("by_creation_time"),
    Item.orderStream("asc"),
    Item.mapStream(
      E.fn(function* (item) {
        const details = yield* pipe(
          yield* Detail.query,
          Detail.withIndex("by_item", (q) => q.eq("itemId", item._id)),
          Detail.collect,
        )
        return {id: item._id, name: item.name, detailCount: details.length}
      }),
    ),
    collectStream,
  )
```

### Error Handling in Stream Maps

Errors thrown in map functions propagate and fail the entire stream. Recover inside the map if needed:

```typescript
class TransformError extends Data.TaggedError("TransformError")<{reason: string}> {}

// Error propagates - fails entire stream
yield *
  pipe(
    yield * Item.stream,
    Item.withStreamIndex("by_creation_time"),
    Item.orderStream("asc"),
    Item.mapStream(
      E.fn(function* (item) {
        if (item.value < 0) {
          return yield* new TransformError({reason: "Negative value"})
        }
        return {id: item._id, value: item.value}
      }),
    ),
    collectStream,
  )

// Error recovery inside map - stream continues
yield *
  pipe(
    yield * Item.stream,
    Item.withStreamIndex("by_creation_time"),
    Item.orderStream("asc"),
    Item.mapStream(
      E.fn(function* (item) {
        if (item.value < 0) {
          return yield* pipe(
            new TransformError({reason: "Negative value"}),
            E.catchTag("TransformError", () =>
              E.succeed({id: item._id, value: 0, recovered: true}),
            ),
          )
        }
        return {id: item._id, value: item.value, recovered: false}
      }),
    ),
    collectStream,
  )
```

### Map to Null for Filtering

Returning `null` from a map filters out that item:

```typescript
// Keep only items matching category, filter out others
yield *
  pipe(
    yield * Item.stream,
    Item.withStreamIndex("by_creation_time"),
    Item.orderStream("asc"),
    Item.mapStream((item) =>
      E.succeed(item.category === "wanted" ? {id: item._id, name: item.name} : null),
    ),
    collectStream,
  ) // Returns only matching items, nulls filtered out
```

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

### Assigning Effect result to variable before pipe

```typescript
// VERBOSE
const items = yield * db.query("items").collect()
return yield * pipe(items, E.succeed, E.andThen(transform))

// BETTER - yield directly in pipe
return yield * pipe(yield * db.query("items").collect(), transform)
```

### Assigning Option result to variable

```typescript
// VERBOSE
const result = yield * db.query("items").first()
return Option.getOrNull(result)

// BETTER - use E.andThen in pipe
return yield * db.query("items").first().pipe(E.andThen(Option.getOrNull))
```
