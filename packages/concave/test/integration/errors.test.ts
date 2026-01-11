import {describe, expect, it} from "vitest"

import {api} from "../convex/_generated/api"
import {setup} from "../setup"

describe("Error Handling", () => {
  describe("DocNotUniqueError", () => {
    it("should throw when unique() finds multiple documents", async () => {
      const t = setup()

      // Create two users with the same email (normally prevented by app logic)
      // We'll use direct database access for this test
      await t.run(async (ctx) => {
        await ctx.db.insert("users", {
          name: "User 1",
          email: "duplicate@example.com",
          role: "user",
          createdAt: Date.now(),
        })
        await ctx.db.insert("users", {
          name: "User 2",
          email: "duplicate@example.com",
          role: "user",
          createdAt: Date.now(),
        })
      })

      // Query for the duplicate email should throw
      await expect(
        t.query(api.functions.users.getUserByEmail, {
          email: "duplicate@example.com",
        }),
      ).rejects.toThrow()
    })
  })

  describe("Invalid operations", () => {
    it("should handle operations on non-existent documents gracefully", async () => {
      const t = setup()

      // Create and delete a user to get a valid but non-existent ID
      const userId = await t.mutation(api.functions.users.createUser, {
        name: "Temp",
        email: "temp@example.com",
        role: "user",
      })

      await t.mutation(api.functions.users.deleteUser, {id: userId})

      // Get should return null
      const user = await t.query(api.functions.users.getUser, {id: userId})
      expect(user).toBeNull()
    })

    it("should handle normalizeId with invalid ID strings", async () => {
      const t = setup()

      const result = await t.query(api.functions.users.normalizeUserId, {
        idString: "not-a-valid-id",
      })

      expect(result).toBeNull()
    })

    it("should handle normalizeId with empty string", async () => {
      const t = setup()

      const result = await t.query(api.functions.users.normalizeUserId, {
        idString: "",
      })

      expect(result).toBeNull()
    })
  })

  describe("Query error scenarios", () => {
    it("should return null for first() on empty results", async () => {
      const t = setup()

      const user = await t.query(api.functions.users.getFirstUser, {})

      expect(user).toBeNull()
    })

    it("should return empty array for collect() on empty results", async () => {
      const t = setup()

      const users = await t.query(api.functions.users.listUsers, {})

      expect(users).toEqual([])
    })

    it("should return null for unique() on no matches", async () => {
      const t = setup()

      const user = await t.query(api.functions.users.getUserByEmail, {
        email: "nonexistent@example.com",
      })

      expect(user).toBeNull()
    })
  })
})
