import {describe, expect, it} from "vitest"

import {api} from "../convex/_generated/api"
import {setup} from "../setup"

describe("Mutation Operations", () => {
  describe("insert", () => {
    it("should insert a document and return the generated ID", async () => {
      const t = setup()

      const userId = await t.mutation(api.functions.users.createUser, {
        name: "John Doe",
        email: "john@example.com",
        role: "user",
      })

      expect(userId).toBeDefined()
      expect(typeof userId).toBe("string")
    })

    it("should insert a document with all field types", async () => {
      const t = setup()

      const userId = await t.mutation(api.functions.users.createUser, {
        name: "Jane Doe",
        email: "jane@example.com",
        role: "admin",
      })

      const user = await t.query(api.functions.users.getUser, {id: userId})

      expect(user).toBeDefined()
      expect(user?.name).toBe("Jane Doe")
      expect(user?.email).toBe("jane@example.com")
      expect(user?.role).toBe("admin")
      expect(user?.createdAt).toBeTypeOf("number")
    })

    it("should insert a document with optional fields omitted", async () => {
      const t = setup()

      const userId = await t.mutation(api.functions.users.createUser, {
        name: "Test User",
        email: "test@example.com",
        role: "user",
      })

      const user = await t.query(api.functions.users.getUser, {id: userId})

      expect(user).toBeDefined()
      expect(user?.profileImageId).toBeUndefined()
    })
  })

  describe("get", () => {
    it("should return the document when it exists", async () => {
      const t = setup()

      const userId = await t.mutation(api.functions.users.createUser, {
        name: "Get Test",
        email: "get@example.com",
        role: "user",
      })

      const user = await t.query(api.functions.users.getUser, {id: userId})

      expect(user).toBeDefined()
      expect(user?._id).toBe(userId)
      expect(user?.name).toBe("Get Test")
    })

    it("should return null when document does not exist", async () => {
      const t = setup()

      // Create a user first to get a valid ID format, then delete it
      const userId = await t.mutation(api.functions.users.createUser, {
        name: "Temp User",
        email: "temp@example.com",
        role: "user",
      })

      await t.mutation(api.functions.users.deleteUser, {id: userId})

      const user = await t.query(api.functions.users.getUser, {id: userId})

      expect(user).toBeNull()
    })
  })

  describe("patch", () => {
    it("should patch a single field", async () => {
      const t = setup()

      const userId = await t.mutation(api.functions.users.createUser, {
        name: "Original Name",
        email: "patch@example.com",
        role: "user",
      })

      await t.mutation(api.functions.users.updateUser, {
        id: userId,
        name: "Updated Name",
      })

      const user = await t.query(api.functions.users.getUser, {id: userId})

      expect(user?.name).toBe("Updated Name")
      expect(user?.email).toBe("patch@example.com") // Unchanged
    })

    it("should patch multiple fields", async () => {
      const t = setup()

      const userId = await t.mutation(api.functions.users.createUser, {
        name: "Multi Patch",
        email: "multi@example.com",
        role: "user",
      })

      await t.mutation(api.functions.users.updateUser, {
        id: userId,
        name: "New Name",
        email: "new@example.com",
        role: "admin",
      })

      const user = await t.query(api.functions.users.getUser, {id: userId})

      expect(user?.name).toBe("New Name")
      expect(user?.email).toBe("new@example.com")
      expect(user?.role).toBe("admin")
    })

    it("should preserve unmodified fields", async () => {
      const t = setup()

      const userId = await t.mutation(api.functions.users.createUser, {
        name: "Preserve Test",
        email: "preserve@example.com",
        role: "user",
      })

      const originalUser = await t.query(api.functions.users.getUser, {id: userId})
      const originalCreatedAt = originalUser?.createdAt

      await t.mutation(api.functions.users.updateUser, {
        id: userId,
        name: "Changed Name",
      })

      const updatedUser = await t.query(api.functions.users.getUser, {id: userId})

      expect(updatedUser?.createdAt).toBe(originalCreatedAt)
      expect(updatedUser?.email).toBe("preserve@example.com")
    })
  })

  describe("replace", () => {
    it("should replace the entire document", async () => {
      const t = setup()

      const userId = await t.mutation(api.functions.users.createUser, {
        name: "Replace Test",
        email: "replace@example.com",
        role: "user",
      })

      const originalUser = await t.query(api.functions.users.getUser, {id: userId})

      await t.mutation(api.functions.users.replaceUser, {
        id: userId,
        name: "Replaced Name",
        email: "replaced@example.com",
        role: "admin",
        createdAt: originalUser!.createdAt,
      })

      const replacedUser = await t.query(api.functions.users.getUser, {id: userId})

      expect(replacedUser?.name).toBe("Replaced Name")
      expect(replacedUser?.email).toBe("replaced@example.com")
      expect(replacedUser?.role).toBe("admin")
    })

    it("should maintain _id and _creationTime after replace", async () => {
      const t = setup()

      const userId = await t.mutation(api.functions.users.createUser, {
        name: "ID Test",
        email: "id@example.com",
        role: "user",
      })

      const originalUser = await t.query(api.functions.users.getUser, {id: userId})

      await t.mutation(api.functions.users.replaceUser, {
        id: userId,
        name: "New Name",
        email: "new@example.com",
        role: "admin",
        createdAt: originalUser!.createdAt,
      })

      const replacedUser = await t.query(api.functions.users.getUser, {id: userId})

      expect(replacedUser?._id).toBe(originalUser?._id)
      expect(replacedUser?._creationTime).toBe(originalUser?._creationTime)
    })
  })

  describe("delete", () => {
    it("should delete an existing document", async () => {
      const t = setup()

      const userId = await t.mutation(api.functions.users.createUser, {
        name: "Delete Test",
        email: "delete@example.com",
        role: "user",
      })

      // Verify user exists
      const userBefore = await t.query(api.functions.users.getUser, {id: userId})
      expect(userBefore).toBeDefined()

      await t.mutation(api.functions.users.deleteUser, {id: userId})

      // Verify user no longer exists
      const userAfter = await t.query(api.functions.users.getUser, {id: userId})
      expect(userAfter).toBeNull()
    })
  })

  describe("normalizeId", () => {
    it("should return the ID when valid", async () => {
      const t = setup()

      const userId = await t.mutation(api.functions.users.createUser, {
        name: "Normalize Test",
        email: "normalize@example.com",
        role: "user",
      })

      const normalizedId = await t.query(api.functions.users.normalizeUserId, {
        idString: userId,
      })

      expect(normalizedId).toBe(userId)
    })

    it("should return null for invalid ID format", async () => {
      const t = setup()

      const normalizedId = await t.query(api.functions.users.normalizeUserId, {
        idString: "invalid-id-format",
      })

      expect(normalizedId).toBeNull()
    })
  })

  it("should call runMutation and runQuery within a mutation", async () => {
    const t = setup()

    const user = await t.mutation(api.functions.users.createAndGetUser, {
      name: "Nested Test",
      email: "nested@example.com",
      role: "user",
    })

    expect(user).toBeDefined()
    expect(user?.name).toBe("Nested Test")
    expect(user?.email).toBe("nested@example.com")
  })
})
