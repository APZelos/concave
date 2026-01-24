import {describe, expect, it} from "vitest"

import {api} from "../../convex/_generated/api"
import {setup} from "../../setup"

async function createTestItem(
  t: ReturnType<typeof setup>,
  overrides: {
    name?: string
    category?: string
    status?: "active" | "inactive"
    priority?: number
    value?: number
    content?: string
  } = {},
) {
  return await t.run(async (ctx) => {
    return await ctx.db.insert("items", {
      name: overrides.name ?? "Test Item",
      category: overrides.category ?? "default",
      status: overrides.status ?? "active",
      priority: overrides.priority ?? 1,
      value: overrides.value ?? 0,
      content: overrides.content,
      createdAt: Date.now(),
    })
  })
}

async function createSession(
  t: ReturnType<typeof setup>,
  overrides: {
    token?: string
    userId?: string
    expiresAt?: number
  } = {},
) {
  return await t.run(async (ctx) => {
    return await ctx.db.insert("sessions", {
      token: overrides.token ?? "test-token",
      userId: overrides.userId ?? "user-123",
      expiresAt: overrides.expiresAt ?? Date.now() + 3600000,
    })
  })
}

describe("customQuery", () => {
  describe("Basic usage without input overrides", () => {
    it("should execute basic query without args", async () => {
      const t = setup()

      const result = await t.query(api.functions.customFunctions.customQueryBasic, {})

      expect(result).toBe("basic result")
    })

    it("should pass handler args correctly", async () => {
      const t = setup()

      const result = await t.query(api.functions.customFunctions.customQueryBasicWithArgs, {
        message: "hello world",
      })

      expect(result).toBe("received: hello world")
    })

    it("should allow database access via QueryCtx", async () => {
      const t = setup()

      await createTestItem(t, {name: "Item A"})
      await createTestItem(t, {name: "Item B"})
      await createTestItem(t, {name: "Item C"})

      const result = await t.query(api.functions.customFunctions.customQueryBasicWithDbAccess, {})

      expect(result).toHaveLength(3)
      expect(result).toContain("Item A")
      expect(result).toContain("Item B")
      expect(result).toContain("Item C")
    })
  })

  describe("Extra args merged with handler args", () => {
    it("should accept extra args in API call", async () => {
      const t = setup()

      const result = await t.query(api.functions.customFunctions.customQueryWithExtraArgs, {
        optionalToken: "my-token",
      })

      expect(result).toBe("extra args accepted")
    })

    it("should accept optional extra args", async () => {
      const t = setup()

      const result = await t.query(api.functions.customFunctions.customQueryWithExtraArgs, {})

      expect(result).toBe("extra args accepted")
    })

    it("should merge extra args with handler args", async () => {
      const t = setup()

      const result = await t.query(api.functions.customFunctions.customQueryWithMergedArgs, {
        optionalToken: "token-123",
        name: "Test Name",
      })

      expect(result).toBe("name: Test Name")
    })
  })

  describe("Input function adding args", () => {
    it("should provide input-added args to handler", async () => {
      const t = setup()

      const result = await t.query(api.functions.customFunctions.customQueryWithInputAddedArgs, {})

      expect(result).toHaveProperty("serverTimestamp")
      expect(result).toHaveProperty("requestId", "req-123")
      expect(typeof result.serverTimestamp).toBe("number")
    })

    it("should merge input args with handler args", async () => {
      const t = setup()

      const result = await t.query(
        api.functions.customFunctions.customQueryWithInputAndHandlerArgs,
        {clientData: "client-value"},
      )

      expect(result).toHaveProperty("serverTimestamp")
      expect(result).toHaveProperty("requestId", "req-123")
      expect(result).toHaveProperty("clientData", "client-value")
    })
  })

  describe("Input function providing custom context", () => {
    it("should use custom context in handler", async () => {
      const t = setup()

      const result = await t.query(api.functions.customFunctions.customQueryWithCustomContext, {
        contextValue: "hello",
      })

      expect(result).toBe("HELLO")
    })
  })

  describe("Input function injecting layers", () => {
    it("should inject single layer and access it in handler", async () => {
      const t = setup()

      const result = await t.query(api.functions.customFunctions.customQueryWithLayer, {
        token: "my-session-token",
      })

      expect(result).toBe("my-session-token")
    })

    it("should handle optional layer values", async () => {
      const t = setup()

      const result = await t.query(api.functions.customFunctions.customQueryWithLayer, {})

      expect(result).toBe("no token")
    })

    it("should inject multiple layers", async () => {
      const t = setup()

      const result = await t.query(api.functions.customFunctions.customQueryWithMultipleLayers, {
        token: "session-abc",
        userId: "user-456",
        role: "admin",
      })

      expect(result).toEqual({
        token: "session-abc",
        userId: "user-456",
        role: "admin",
        hasTimestamp: true,
      })
    })
  })

  describe("Error handling in input function", () => {
    it("should succeed when input does not error", async () => {
      const t = setup()

      const result = await t.query(api.functions.customFunctions.customQueryInputErrorSuccess, {
        shouldFail: false,
      })

      expect(result).toBe("input succeeded")
    })

    it("should propagate error from input function", async () => {
      const t = setup()

      await expect(
        t.query(api.functions.customFunctions.customQueryInputErrorFail, {
          shouldFail: true,
        }),
      ).rejects.toThrow()
    })
  })

  describe("Error handling in handler", () => {
    it("should succeed when handler does not error", async () => {
      const t = setup()

      const result = await t.query(api.functions.customFunctions.customQueryHandlerError, {
        shouldFail: false,
      })

      expect(result).toBe("handler succeeded")
    })

    it("should propagate error from handler", async () => {
      const t = setup()

      await expect(
        t.query(api.functions.customFunctions.customQueryHandlerError, {
          shouldFail: true,
        }),
      ).rejects.toThrow()
    })
  })

  describe("Authentication/session pattern", () => {
    it("should fail when no session token provided", async () => {
      const t = setup()

      await expect(
        t.query(api.functions.customFunctions.customQueryAuthenticated, {}),
      ).rejects.toThrow()
    })

    it("should fail when session token is invalid", async () => {
      const t = setup()

      await expect(
        t.query(api.functions.customFunctions.customQueryAuthenticated, {
          sessionToken: "invalid-token",
        }),
      ).rejects.toThrow()
    })

    it("should succeed with valid session token", async () => {
      const t = setup()

      await createSession(t, {token: "valid-token", userId: "user-789"})

      const result = await t.query(api.functions.customFunctions.customQueryAuthenticated, {
        sessionToken: "valid-token",
      })

      expect(result).toEqual({
        userId: "user-789",
        role: "authenticated",
        authenticatedUserId: "user-789",
      })
    })
  })

  describe("Complex scenario combining all features", () => {
    it("should combine args, input args, layers, and context", async () => {
      const t = setup()

      await createSession(t, {token: "complex-token", userId: "complex-user"})
      await createTestItem(t, {name: "Complex Item 1"})
      await createTestItem(t, {name: "Complex Item 2"})

      const result = await t.query(api.functions.customFunctions.customQueryComplex, {
        sessionToken: "complex-token",
        optionalMetadata: "custom-metadata",
        queryParam: "query-value",
      })

      expect(result.token).toBe("complex-token")
      expect(result.userId).toBe("complex-user")
      expect(result.role).toBe("authenticated")
      expect(result.hasTimestamp).toBe(true)
      expect(result.requestId).toMatch(/^req-\d+$/)
      expect(result.metadata).toBe("custom-metadata")
      expect(result.queryParam).toBe("query-value")
      expect(result.itemCount).toBe(2)
    })

    it("should work with default optional values", async () => {
      const t = setup()

      const result = await t.query(api.functions.customFunctions.customQueryComplex, {
        queryParam: "test-param",
      })

      expect(result.token).toBe("no token")
      expect(result.userId).toBe("anonymous")
      expect(result.role).toBe("guest")
      expect(result.hasTimestamp).toBe(true)
      expect(result.requestId).toMatch(/^req-\d+$/)
      expect(result.metadata).toBe("default")
      expect(result.queryParam).toBe("test-param")
      expect(result.itemCount).toBe(0)
    })
  })
})

describe("customMutation", () => {
  describe("Basic usage without input overrides", () => {
    it("should execute basic mutation without args", async () => {
      const t = setup()

      const result = await t.mutation(api.functions.customFunctions.customMutationBasic, {})

      expect(result).toBe("basic mutation result")
    })

    it("should pass handler args correctly", async () => {
      const t = setup()

      const result = await t.mutation(api.functions.customFunctions.customMutationBasicWithArgs, {
        message: "hello world",
      })

      expect(result).toBe("received: hello world")
    })

    it("should allow database writes via MutationCtx", async () => {
      const t = setup()

      const itemId = await t.mutation(
        api.functions.customFunctions.customMutationBasicWithDbWrite,
        {name: "New Item"},
      )

      expect(itemId).toBeDefined()

      // Verify the item was actually written
      const item = await t.run(async (ctx) => {
        return await ctx.db.get(itemId)
      })

      expect(item).toBeDefined()
      expect(item?.name).toBe("New Item")
      expect(item?.category).toBe("test")
    })
  })

  describe("Extra args merged with handler args", () => {
    it("should accept extra args in API call", async () => {
      const t = setup()

      const result = await t.mutation(api.functions.customFunctions.customMutationWithExtraArgs, {
        optionalToken: "my-token",
      })

      expect(result).toBe("extra args accepted")
    })

    it("should accept optional extra args", async () => {
      const t = setup()

      const result = await t.mutation(api.functions.customFunctions.customMutationWithExtraArgs, {})

      expect(result).toBe("extra args accepted")
    })

    it("should merge extra args with handler args", async () => {
      const t = setup()

      const result = await t.mutation(api.functions.customFunctions.customMutationWithMergedArgs, {
        optionalToken: "token-123",
        name: "Test Name",
      })

      expect(result).toBe("name: Test Name")
    })
  })

  describe("Input function adding args", () => {
    it("should provide input-added args to handler", async () => {
      const t = setup()

      const result = await t.mutation(
        api.functions.customFunctions.customMutationWithInputAddedArgs,
        {},
      )

      expect(result).toHaveProperty("serverTimestamp")
      expect(result).toHaveProperty("requestId", "req-123")
      expect(typeof result.serverTimestamp).toBe("number")
    })

    it("should merge input args with handler args", async () => {
      const t = setup()

      const result = await t.mutation(
        api.functions.customFunctions.customMutationWithInputAndHandlerArgs,
        {clientData: "client-value"},
      )

      expect(result).toHaveProperty("serverTimestamp")
      expect(result).toHaveProperty("requestId", "req-123")
      expect(result).toHaveProperty("clientData", "client-value")
    })
  })

  describe("Input function providing custom context", () => {
    it("should use custom context in handler", async () => {
      const t = setup()

      const result = await t.mutation(
        api.functions.customFunctions.customMutationWithCustomContext,
        {
          contextValue: "hello",
        },
      )

      expect(result).toBe("HELLO")
    })
  })

  describe("Input function injecting layers", () => {
    it("should inject single layer and access it in handler", async () => {
      const t = setup()

      const result = await t.mutation(api.functions.customFunctions.customMutationWithLayer, {
        token: "my-session-token",
      })

      expect(result).toBe("my-session-token")
    })

    it("should handle optional layer values", async () => {
      const t = setup()

      const result = await t.mutation(api.functions.customFunctions.customMutationWithLayer, {})

      expect(result).toBe("no token")
    })

    it("should inject multiple layers", async () => {
      const t = setup()

      const result = await t.mutation(
        api.functions.customFunctions.customMutationWithMultipleLayers,
        {
          token: "session-abc",
          userId: "user-456",
          role: "admin",
        },
      )

      expect(result).toEqual({
        token: "session-abc",
        userId: "user-456",
        role: "admin",
        hasTimestamp: true,
      })
    })
  })

  describe("Error handling in input function", () => {
    it("should succeed when input does not error", async () => {
      const t = setup()

      const result = await t.mutation(
        api.functions.customFunctions.customMutationInputErrorSuccess,
        {
          shouldFail: false,
        },
      )

      expect(result).toBe("input succeeded")
    })

    it("should propagate error from input function", async () => {
      const t = setup()

      await expect(
        t.mutation(api.functions.customFunctions.customMutationInputErrorFail, {
          shouldFail: true,
        }),
      ).rejects.toThrow()
    })
  })

  describe("Error handling in handler", () => {
    it("should succeed when handler does not error", async () => {
      const t = setup()

      const result = await t.mutation(api.functions.customFunctions.customMutationHandlerError, {
        shouldFail: false,
      })

      expect(result).toBe("handler succeeded")
    })

    it("should propagate error from handler", async () => {
      const t = setup()

      await expect(
        t.mutation(api.functions.customFunctions.customMutationHandlerError, {
          shouldFail: true,
        }),
      ).rejects.toThrow()
    })
  })

  describe("Authentication/session pattern", () => {
    it("should fail when no session token provided", async () => {
      const t = setup()

      await expect(
        t.mutation(api.functions.customFunctions.customMutationAuthenticated, {}),
      ).rejects.toThrow()
    })

    it("should fail when session token is invalid", async () => {
      const t = setup()

      await expect(
        t.mutation(api.functions.customFunctions.customMutationAuthenticated, {
          sessionToken: "invalid-token",
        }),
      ).rejects.toThrow()
    })

    it("should succeed with valid session token", async () => {
      const t = setup()

      await createSession(t, {token: "valid-token", userId: "user-789"})

      const result = await t.mutation(api.functions.customFunctions.customMutationAuthenticated, {
        sessionToken: "valid-token",
      })

      expect(result).toEqual({
        userId: "user-789",
        role: "authenticated",
        authenticatedUserId: "user-789",
      })
    })

    it("should allow authenticated mutations with writes", async () => {
      const t = setup()

      await createSession(t, {token: "write-token", userId: "writer-user"})

      const result = await t.mutation(
        api.functions.customFunctions.customMutationAuthenticatedWithWrite,
        {
          sessionToken: "write-token",
          itemName: "Authenticated Item",
        },
      )

      expect(result.userId).toBe("writer-user")
      expect(result.id).toBeDefined()

      // Verify the item was written
      const item = await t.run(async (ctx) => {
        return await ctx.db.get(result.id)
      })

      expect(item?.name).toBe("Authenticated Item")
      expect(item?.content).toBe("Created by writer-user")
    })
  })

  describe("Complex scenario combining all features", () => {
    it("should combine args, input args, layers, context, and db writes", async () => {
      const t = setup()

      await createSession(t, {token: "complex-token", userId: "complex-user"})
      await createTestItem(t, {name: "Existing Item 1"})

      const result = await t.mutation(api.functions.customFunctions.customMutationComplex, {
        sessionToken: "complex-token",
        optionalMetadata: "custom-metadata",
        mutationParam: "mutation-value",
        itemName: "New Complex Item",
      })

      expect(result.token).toBe("complex-token")
      expect(result.userId).toBe("complex-user")
      expect(result.role).toBe("authenticated")
      expect(result.hasTimestamp).toBe(true)
      expect(result.requestId).toMatch(/^req-\d+$/)
      expect(result.metadata).toBe("custom-metadata")
      expect(result.mutationParam).toBe("mutation-value")
      expect(result.itemCount).toBe(2) // 1 existing + 1 new
      expect(result.itemId).toBeDefined()

      // Verify the item was written
      const item = await t.run(async (ctx) => {
        return await ctx.db.get(result.itemId)
      })

      expect(item?.name).toBe("New Complex Item")
      expect(item?.content).toBe("mutation-value")
    })

    it("should work with default optional values", async () => {
      const t = setup()

      const result = await t.mutation(api.functions.customFunctions.customMutationComplex, {
        mutationParam: "test-param",
        itemName: "Default Item",
      })

      expect(result.token).toBe("no token")
      expect(result.userId).toBe("anonymous")
      expect(result.role).toBe("guest")
      expect(result.hasTimestamp).toBe(true)
      expect(result.requestId).toMatch(/^req-\d+$/)
      expect(result.metadata).toBe("default")
      expect(result.mutationParam).toBe("test-param")
      expect(result.itemCount).toBe(1)
      expect(result.itemId).toBeDefined()
    })
  })
})
