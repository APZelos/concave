import type {Doc, Id} from "./_generated/dataModel"

import {httpRouter} from "convex/server"
import {Effect as E, Schema as S} from "effect"

import {HttpActionCtx} from "../../src/server"
import {internal} from "./_generated/api"
import {httpAction} from "./concave"

const http = httpRouter()

http.route({
  path: "/users",
  method: "POST",
  handler: httpAction(
    E.fn(function* (request: Request) {
      const ctx = yield* HttpActionCtx

      const body = yield* E.tryPromise({
        try: async () =>
          S.decodeUnknownSync(
            S.Struct({
              name: S.String,
              email: S.String,
              role: S.Union(S.Literal("admin"), S.Literal("user")),
            }),
          )(await request.json()),
        catch: () => new Error("Failed to parse JSON"),
      })

      const createUserEffect: E.Effect<Id<"users">> = ctx.runMutation(
        internal.functions.users.internalCreateUser,
        {
          name: body.name,
          email: body.email,
          role: body.role,
        },
      )
      const userId = yield* createUserEffect

      const getUserEffect: E.Effect<Doc<"users"> | null> = ctx.runQuery(
        internal.functions.users.internalGetUser,
        {id: userId},
      )
      const user = yield* getUserEffect

      return new Response(JSON.stringify(user), {
        status: 201,
        headers: {"Content-Type": "application/json"},
      })
    }),
  ),
})

http.route({
  path: "/users",
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

      const getUserEffect: E.Effect<Doc<"users"> | null> = ctx.runQuery(
        internal.functions.users.internalGetUser,
        {id: id as Id<"users">},
      )
      const user = yield* getUserEffect

      if (!user) {
        return new Response(JSON.stringify({error: "User not found"}), {
          status: 404,
          headers: {"Content-Type": "application/json"},
        })
      }

      return new Response(JSON.stringify(user), {
        status: 200,
        headers: {"Content-Type": "application/json"},
      })
    }),
  ),
})

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
