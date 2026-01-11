import {describe, expect, it} from "vitest"

import {api, internal} from "../convex/_generated/api"
import {setup} from "../setup"

describe("Server Function Builders", () => {
  describe("query", () => {
    it("should work without args", async () => {
      const t = setup()

      // Create some data first
      await t.mutation(api.functions.users.createUser, {
        name: "No Args Test",
        email: "noargs@example.com",
        role: "user",
      })

      const users = await t.query(api.functions.users.listUsers, {})

      expect(users).toHaveLength(1)
    })

    it("should work with args schema", async () => {
      const t = setup()

      const userId = await t.mutation(api.functions.users.createUser, {
        name: "Args Test",
        email: "args@example.com",
        role: "user",
      })

      const user = await t.query(api.functions.users.getUser, {id: userId})

      expect(user).toBeDefined()
      expect(user?._id).toBe(userId)
    })

    it("should validate args against schema", async () => {
      const t = setup()

      // This should throw because email type is wrong (number instead of string)
      await expect(
        t.query(api.functions.users.getUserByEmail, {
          // @ts-expect-error - testing invalid args (number instead of string)
          email: 123,
        }),
      ).rejects.toThrow()
    })
  })

  describe("mutation", () => {
    it("should work with args schema", async () => {
      const t = setup()

      const userId = await t.mutation(api.functions.users.createUser, {
        name: "Mutation Args",
        email: "mutation@example.com",
        role: "admin",
      })

      expect(userId).toBeDefined()

      const user = await t.query(api.functions.users.getUser, {id: userId})
      expect(user?.role).toBe("admin")
    })

    it("should handle complex args with nested schemas", async () => {
      const t = setup()

      const result = await t.query(api.functions.users.listUsersPaginated, {
        paginationOpts: {
          numItems: 10,
          cursor: null,
        },
      })

      expect(result).toBeDefined()
      expect(result.page).toBeDefined()
    })
  })

  describe("internalQuery", () => {
    it("should be accessible from other functions", async () => {
      const t = setup()

      const userId = await t.mutation(api.functions.users.createUser, {
        name: "Internal Query Test",
        email: "internal@example.com",
        role: "user",
      })

      // Access internal query through a public mutation
      const user = await t.query(api.functions.context.getUserViaNestedQuery, {id: userId})

      expect(user).toBeDefined()
      expect(user?.name).toBe("Internal Query Test")
    })

    it("should be directly callable in tests", async () => {
      const t = setup()

      const userId = await t.mutation(api.functions.users.createUser, {
        name: "Direct Internal",
        email: "direct@example.com",
        role: "user",
      })

      const user = await t.query(internal.functions.users.internalGetUser, {id: userId})

      expect(user).toBeDefined()
      expect(user?.name).toBe("Direct Internal")
    })
  })

  describe("internalMutation", () => {
    it("should be accessible from other functions", async () => {
      const t = setup()

      // Use a public mutation that calls internal mutation
      const user = await t.mutation(api.functions.context.createAndGetUser, {
        name: "Internal Mutation Test",
        email: "internalmut@example.com",
        role: "admin",
      })

      expect(user).toBeDefined()
      expect(user?.name).toBe("Internal Mutation Test")
    })

    it("should be directly callable in tests", async () => {
      const t = setup()

      const userId = await t.mutation(internal.functions.users.internalCreateUser, {
        name: "Direct Internal Mutation",
        email: "directmut@example.com",
        role: "user",
      })

      expect(userId).toBeDefined()

      const user = await t.query(api.functions.users.getUser, {id: userId})
      expect(user?.name).toBe("Direct Internal Mutation")
    })
  })

  describe("Function return values", () => {
    it("should return null for non-existent documents", async () => {
      const t = setup()

      // Get a valid ID then delete it
      const userId = await t.mutation(api.functions.users.createUser, {
        name: "Temp",
        email: "temp@example.com",
        role: "user",
      })

      await t.mutation(api.functions.users.deleteUser, {id: userId})

      const user = await t.query(api.functions.users.getUser, {id: userId})

      expect(user).toBeNull()
    })

    it("should return arrays from collect", async () => {
      const t = setup()

      await t.mutation(api.functions.users.createUser, {
        name: "User 1",
        email: "user1@example.com",
        role: "user",
      })

      const users = await t.query(api.functions.users.listUsers, {})

      expect(Array.isArray(users)).toBe(true)
    })

    it("should return pagination result with correct structure", async () => {
      const t = setup()

      await t.mutation(api.functions.users.createUser, {
        name: "Pagination User",
        email: "pagination@example.com",
        role: "user",
      })

      const result = await t.query(api.functions.users.listUsersPaginated, {
        paginationOpts: {numItems: 10, cursor: null},
      })

      expect(result).toHaveProperty("page")
      expect(result).toHaveProperty("isDone")
      expect(result).toHaveProperty("continueCursor")
    })
  })
})
