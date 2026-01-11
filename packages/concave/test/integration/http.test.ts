import {Schema as S} from "effect"
import {describe, expect, it} from "vitest"

import {setup} from "../setup"

// Schemas for parsing HTTP responses
const UserResponse = S.Struct({
  _id: S.String,
  _creationTime: S.Number,
  name: S.String,
  email: S.String,
  role: S.Union(S.Literal("admin"), S.Literal("user")),
  createdAt: S.Number,
  profileImageId: S.optional(S.String),
})

const ErrorResponse = S.Struct({
  error: S.String,
})

const HealthResponse = S.Struct({
  status: S.String,
})

describe("HTTP Actions", () => {
  describe("POST /users", () => {
    it("should create a user and return it", async () => {
      const t = setup()

      const response = await t.fetch("/users", {
        method: "POST",
        body: JSON.stringify({
          name: "HTTP User",
          email: "http@example.com",
          role: "user",
        }),
      })

      expect(response.status).toBe(201)

      const user = S.decodeUnknownSync(UserResponse)(await response.json())

      expect(user).toBeDefined()
      expect(user.name).toBe("HTTP User")
      expect(user.email).toBe("http@example.com")
      expect(user._id).toBeDefined()
    })

    it("should return correct content-type header", async () => {
      const t = setup()

      const response = await t.fetch("/users", {
        method: "POST",
        body: JSON.stringify({
          name: "Header Test",
          email: "header@example.com",
          role: "admin",
        }),
      })

      expect(response.headers.get("Content-Type")).toBe("application/json")
    })
  })

  describe("GET /users", () => {
    it("should return user by id", async () => {
      const t = setup()

      // Create a user first
      const createResponse = await t.fetch("/users", {
        method: "POST",
        body: JSON.stringify({
          name: "Get Test User",
          email: "gettest@example.com",
          role: "user",
        }),
      })

      const createdUser = S.decodeUnknownSync(UserResponse)(await createResponse.json())

      // Get the user by ID
      const getResponse = await t.fetch(`/users?id=${createdUser._id}`, {
        method: "GET",
      })

      expect(getResponse.status).toBe(200)

      const user = S.decodeUnknownSync(UserResponse)(await getResponse.json())

      expect(user.name).toBe("Get Test User")
      expect(user._id).toBe(createdUser._id)
    })

    it("should return 400 when id parameter is missing", async () => {
      const t = setup()

      const response = await t.fetch("/users", {
        method: "GET",
      })

      expect(response.status).toBe(400)

      const error = S.decodeUnknownSync(ErrorResponse)(await response.json())

      expect(error.error).toBe("id parameter required")
    })

    it("should return 404 when user not found", async () => {
      const t = setup()

      // Create and delete a user to get a valid but non-existent ID
      const createResponse = await t.fetch("/users", {
        method: "POST",
        body: JSON.stringify({
          name: "Temp User",
          email: "temphttp@example.com",
          role: "user",
        }),
      })

      const createdUser = S.decodeUnknownSync(UserResponse)(await createResponse.json())

      // Delete the user via a mutation
      await t.run(async (ctx) => {
        await ctx.db.delete(createdUser._id as never)
      })

      // Try to get the deleted user
      const getResponse = await t.fetch(`/users?id=${createdUser._id}`, {
        method: "GET",
      })

      expect(getResponse.status).toBe(404)

      const error = S.decodeUnknownSync(ErrorResponse)(await getResponse.json())

      expect(error.error).toBe("User not found")
    })
  })

  describe("GET /health", () => {
    it("should return health status", async () => {
      const t = setup()

      const response = await t.fetch("/health", {
        method: "GET",
      })

      expect(response.status).toBe(200)

      const body = S.decodeUnknownSync(HealthResponse)(await response.json())

      expect(body.status).toBe("ok")
    })
  })

  describe("HTTP action context", () => {
    it("should have access to runMutation and runQuery", async () => {
      const t = setup()

      // The POST /users endpoint uses both runMutation and runQuery
      const response = await t.fetch("/users", {
        method: "POST",
        body: JSON.stringify({
          name: "Context Test",
          email: "context@example.com",
          role: "user",
        }),
      })

      expect(response.status).toBe(201)

      const user = S.decodeUnknownSync(UserResponse)(await response.json())

      // The fact that we get back the full user object means
      // both runMutation (create) and runQuery (get) worked
      expect(user._id).toBeDefined()
      expect(user._creationTime).toBeDefined()
    })
  })
})
