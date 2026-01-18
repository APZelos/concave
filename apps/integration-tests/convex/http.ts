import {HttpActionCtx} from "@apzelos/concave/server"
import {httpRouter} from "convex/server"
import {Data, Effect as E, Schema as S} from "effect"

import {internal} from "./_generated/api"
import {httpAction} from "./concave"

class HttpTaggedError extends Data.TaggedError("HttpTaggedError")<{
  message: string
}> {}

export class RequestJsonTaggedError extends Data.TaggedError("FetchTaggedError")<{
  message: string
  cause?: unknown
}> {}

const http = httpRouter()

http.route({
  path: "/noauth",
  method: "GET",
  handler: httpAction(
    E.fn(function* (_request: Request) {
      return new Response(JSON.stringify({message: "public get"}), {
        status: 200,
        headers: {"Content-Type": "application/json"},
      })
    }),
  ),
})

http.route({
  path: "/noauth",
  method: "POST",
  handler: httpAction(
    E.fn(function* (request: Request) {
      const body = yield* E.tryPromise({
        try: async () => request.json() as Promise<unknown>,
        catch: (error) =>
          new RequestJsonTaggedError({message: "Failed to read json", cause: error}),
      }).pipe(
        E.flatMap(S.decodeUnknown(S.Struct({data: S.NonEmptyString}))),
        E.mapError((e) => new RequestJsonTaggedError({message: "Validation failed", cause: e})),
      )

      return new Response(JSON.stringify({received: body.data}), {
        status: 201,
        headers: {"Content-Type": "application/json"},
      })
    }),
  ),
})

http.route({
  path: "/auth",
  method: "GET",
  handler: httpAction(
    E.fn(function* (_request: Request) {
      const ctx = yield* HttpActionCtx
      const identity = yield* ctx.auth.getUserIdentity()

      if (!identity) {
        return new Response(JSON.stringify({error: "Unauthorized"}), {
          status: 401,
          headers: {"Content-Type": "application/json"},
        })
      }

      return new Response(
        JSON.stringify({
          tokenIdentifier: identity.tokenIdentifier,
          name: identity.name,
        }),
        {
          status: 200,
          headers: {"Content-Type": "application/json"},
        },
      )
    }),
  ),
})

http.route({
  path: "/auth",
  method: "POST",
  handler: httpAction(
    E.fn(function* (request: Request) {
      const ctx = yield* HttpActionCtx
      const identity = yield* ctx.auth.getUserIdentity()

      if (!identity) {
        return new Response(JSON.stringify({error: "Unauthorized"}), {
          status: 401,
          headers: {"Content-Type": "application/json"},
        })
      }

      const body = yield* E.tryPromise({
        try: async () => request.json() as Promise<unknown>,
        catch: (error) =>
          new RequestJsonTaggedError({message: "Failed to read json", cause: error}),
      }).pipe(
        E.flatMap(S.decodeUnknown(S.Struct({data: S.NonEmptyString}))),
        E.mapError((e) => new RequestJsonTaggedError({message: "Validation failed", cause: e})),
      )

      return new Response(
        JSON.stringify({
          received: body.data,
          user: identity.name,
        }),
        {
          status: 201,
          headers: {"Content-Type": "application/json"},
        },
      )
    }),
  ),
})

http.route({
  path: "/calls-query",
  method: "GET",
  handler: httpAction(
    E.fn(function* (request: Request) {
      const ctx = yield* HttpActionCtx
      const url = new URL(request.url)
      const params = yield* E.try({
        try: () =>
          S.decodeUnknownSync(
            S.Struct({
              value: S.optionalWith(S.NumberFromString, {default: () => 0}),
            }),
          )({
            value: url.searchParams.get("value") ?? undefined,
          }),
        catch: (e) => new RequestJsonTaggedError({message: "Invalid parameters", cause: e}),
      })
      const value = params.value

      const Eresult: E.Effect<string> = ctx.runQuery(
        internal.functions.queries.internalQueryWithArgs,
        {value},
      )
      const result = yield* Eresult

      return new Response(JSON.stringify({result}), {
        status: 200,
        headers: {"Content-Type": "application/json"},
      })
    }),
  ),
})

http.route({
  path: "/calls-mutation",
  method: "POST",
  handler: httpAction(
    E.fn(function* (request: Request) {
      const ctx = yield* HttpActionCtx
      const body = yield* E.tryPromise({
        try: async () => request.json() as Promise<unknown>,
        catch: (error) =>
          new RequestJsonTaggedError({message: "Failed to read json", cause: error}),
      }).pipe(
        E.flatMap(S.decodeUnknown(S.Struct({name: S.NonEmptyString}))),
        E.mapError((e) => new RequestJsonTaggedError({message: "Validation failed", cause: e})),
      )

      const id = yield* ctx.runMutation(internal.functions.mutations.internalMutationInsert, {
        name: body.name,
      })

      return new Response(JSON.stringify({id}), {
        status: 201,
        headers: {"Content-Type": "application/json"},
      })
    }),
  ),
})

http.route({
  path: "/throws-tagged",
  method: "GET",
  handler: httpAction(
    E.fn(function* (_request: Request) {
      return yield* new HttpTaggedError({message: "tagged error thrown"})
    }),
  ),
})

http.route({
  path: "/throws-regular",
  method: "GET",
  handler: httpAction(
    E.fn(function* (_request: Request) {
      throw new Error("regular error thrown")
    }),
  ),
})

http.route({
  path: "/bad-request",
  method: "GET",
  handler: httpAction(
    E.fn(function* (request: Request) {
      const url = new URL(request.url)
      const required = url.searchParams.get("required")

      if (!required) {
        return new Response(JSON.stringify({error: "required parameter missing"}), {
          status: 400,
          headers: {"Content-Type": "application/json"},
        })
      }

      return new Response(JSON.stringify({value: required}), {
        status: 200,
        headers: {"Content-Type": "application/json"},
      })
    }),
  ),
})

http.route({
  path: "/not-found",
  method: "GET",
  handler: httpAction(
    E.fn(function* (request: Request) {
      const ctx = yield* HttpActionCtx
      const url = new URL(request.url)
      const id = url.searchParams.get("id")

      if (!id) {
        return new Response(JSON.stringify({error: "id parameter required"}), {
          status: 400,
          headers: {"Content-Type": "application/json"},
        })
      }

      // Always return null to simulate not found
      yield* ctx.runQuery(internal.functions.queries.internalQueryNoArgs, {})
      const item = null

      if (!item) {
        return new Response(JSON.stringify({error: "Item not found"}), {
          status: 404,
          headers: {"Content-Type": "application/json"},
        })
      }

      return new Response(JSON.stringify(item), {
        status: 200,
        headers: {"Content-Type": "application/json"},
      })
    }),
  ),
})

http.route({
  path: "/with-params",
  method: "GET",
  handler: httpAction(
    E.fn(function* (request: Request) {
      const url = new URL(request.url)
      const params = yield* E.try({
        try: () =>
          S.decodeUnknownSync(
            S.Struct({
              name: S.optionalWith(S.NonEmptyString, {default: () => "default"}),
              count: S.optionalWith(S.NumberFromString, {default: () => 0}),
            }),
          )({
            name: url.searchParams.get("name") ?? undefined,
            count: url.searchParams.get("count") ?? undefined,
          }),
        catch: (e) => new RequestJsonTaggedError({message: "Invalid parameters", cause: e}),
      })

      return new Response(JSON.stringify({name: params.name, count: params.count}), {
        status: 200,
        headers: {"Content-Type": "application/json"},
      })
    }),
  ),
})

// ============================================================================
// Health Check
// ============================================================================

http.route({
  path: "/health",
  method: "GET",
  handler: httpAction(
    E.fn(function* (_request: Request) {
      return new Response(JSON.stringify({status: "ok"}), {
        status: 200,
        headers: {"Content-Type": "application/json"},
      })
    }),
  ),
})

export default http
