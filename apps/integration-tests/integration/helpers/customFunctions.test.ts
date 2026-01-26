/* eslint-disable @typescript-eslint/no-empty-object-type */
import type {Id} from "../../convex/_generated/dataModel"

import {
  expectTypeOfRegisteredActionArgs,
  expectTypeOfRegisteredActionReturns,
  expectTypeOfRegisteredMutationArgs,
  expectTypeOfRegisteredMutationReturns,
  expectTypeOfRegisteredQueryArgs,
  expectTypeOfRegisteredQueryReturns,
} from "@apzelos/concave-internal/assert"
import {describe, expect, it, test} from "vitest"

import {api} from "../../convex/_generated/api"
import * as customFunctions from "../../convex/functions/customFunctions"
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

    test("customQueryBasic types", () => {
      expectTypeOfRegisteredQueryArgs(customFunctions.customQueryBasic).toEqualTypeOf<{}>()
      expectTypeOfRegisteredQueryReturns(customFunctions.customQueryBasic).toEqualTypeOf<
        Promise<string>
      >()
    })

    test("customQueryBasicWithArgs types", () => {
      expectTypeOfRegisteredQueryArgs(customFunctions.customQueryBasicWithArgs).toEqualTypeOf<{
        message: string
      }>()
      expectTypeOfRegisteredQueryReturns(customFunctions.customQueryBasicWithArgs).toEqualTypeOf<
        Promise<string>
      >()
    })

    test("customQueryBasicWithDbAccess types", () => {
      expectTypeOfRegisteredQueryArgs(
        customFunctions.customQueryBasicWithDbAccess,
      ).toEqualTypeOf<{}>()
      expectTypeOfRegisteredQueryReturns(
        customFunctions.customQueryBasicWithDbAccess,
      ).toEqualTypeOf<Promise<string[]>>()
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

    test("customQueryWithExtraArgs types", () => {
      expectTypeOfRegisteredQueryArgs(customFunctions.customQueryWithExtraArgs).toEqualTypeOf<{
        optionalToken?: string | undefined
      }>()
      expectTypeOfRegisteredQueryReturns(customFunctions.customQueryWithExtraArgs).toEqualTypeOf<
        Promise<string>
      >()
    })

    test("customQueryWithMergedArgs types", () => {
      expectTypeOfRegisteredQueryArgs(customFunctions.customQueryWithMergedArgs).toEqualTypeOf<{
        optionalToken?: string | undefined
        name: string
      }>()
      expectTypeOfRegisteredQueryReturns(customFunctions.customQueryWithMergedArgs).toEqualTypeOf<
        Promise<string>
      >()
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

    test("customQueryWithInputAddedArgs types", () => {
      expectTypeOfRegisteredQueryArgs(
        customFunctions.customQueryWithInputAddedArgs,
      ).toEqualTypeOf<{}>()
      expectTypeOfRegisteredQueryReturns(
        customFunctions.customQueryWithInputAddedArgs,
      ).toEqualTypeOf<Promise<{serverTimestamp: number; requestId: "req-123"}>>()
    })

    test("customQueryWithInputAndHandlerArgs types", () => {
      expectTypeOfRegisteredQueryArgs(
        customFunctions.customQueryWithInputAndHandlerArgs,
      ).toEqualTypeOf<{
        clientData: string
      }>()
      expectTypeOfRegisteredQueryReturns(
        customFunctions.customQueryWithInputAndHandlerArgs,
      ).toEqualTypeOf<
        Promise<{serverTimestamp: number; requestId: "req-123"; clientData: string}>
      >()
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

    test("customQueryWithCustomContext types", () => {
      expectTypeOfRegisteredQueryArgs(customFunctions.customQueryWithCustomContext).toEqualTypeOf<{
        contextValue: string
      }>()
      expectTypeOfRegisteredQueryReturns(
        customFunctions.customQueryWithCustomContext,
      ).toEqualTypeOf<Promise<string>>()
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

    test("customQueryWithLayer types", () => {
      expectTypeOfRegisteredQueryArgs(customFunctions.customQueryWithLayer).toEqualTypeOf<{
        token?: string | undefined
      }>()
      expectTypeOfRegisteredQueryReturns(customFunctions.customQueryWithLayer).toEqualTypeOf<
        Promise<string>
      >()
    })

    test("customQueryWithMultipleLayers types", () => {
      expectTypeOfRegisteredQueryArgs(customFunctions.customQueryWithMultipleLayers).toEqualTypeOf<{
        token?: string | undefined
        userId?: string | undefined
        role?: string | undefined
      }>()
      expectTypeOfRegisteredQueryReturns(
        customFunctions.customQueryWithMultipleLayers,
      ).toEqualTypeOf<
        Promise<{token: string; userId: string; role: string; hasTimestamp: boolean}>
      >()
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

    test("customQueryInputErrorSuccess types", () => {
      expectTypeOfRegisteredQueryArgs(customFunctions.customQueryInputErrorSuccess).toEqualTypeOf<{
        shouldFail: boolean
      }>()
      expectTypeOfRegisteredQueryReturns(
        customFunctions.customQueryInputErrorSuccess,
      ).toEqualTypeOf<Promise<string>>()
    })

    test("customQueryInputErrorFail types", () => {
      expectTypeOfRegisteredQueryArgs(customFunctions.customQueryInputErrorFail).toEqualTypeOf<{
        shouldFail: boolean
      }>()
      expectTypeOfRegisteredQueryReturns(customFunctions.customQueryInputErrorFail).toEqualTypeOf<
        Promise<string>
      >()
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

    test("customQueryHandlerError types", () => {
      expectTypeOfRegisteredQueryArgs(customFunctions.customQueryHandlerError).toEqualTypeOf<{
        shouldFail: boolean
      }>()
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

    test("customQueryAuthenticated types", () => {
      expectTypeOfRegisteredQueryArgs(customFunctions.customQueryAuthenticated).toEqualTypeOf<{
        sessionToken?: string | undefined
      }>()
      expectTypeOfRegisteredQueryReturns(customFunctions.customQueryAuthenticated).toEqualTypeOf<
        Promise<{userId: string; role: string; authenticatedUserId: string}>
      >()
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

    test("customQueryComplex types", () => {
      expectTypeOfRegisteredQueryArgs(customFunctions.customQueryComplex).toEqualTypeOf<{
        sessionToken?: string | undefined
        optionalMetadata?: string | undefined
        queryParam: string
      }>()
      expectTypeOfRegisteredQueryReturns(customFunctions.customQueryComplex).toEqualTypeOf<
        Promise<{
          token: string
          userId: string
          role: string
          hasTimestamp: boolean
          requestId: `req-${number}`
          metadata: string
          queryParam: string
          itemCount: number
        }>
      >()
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

    test("customMutationBasic types", () => {
      expectTypeOfRegisteredMutationArgs(customFunctions.customMutationBasic).toEqualTypeOf<{}>()
      expectTypeOfRegisteredMutationReturns(customFunctions.customMutationBasic).toEqualTypeOf<
        Promise<string>
      >()
    })

    test("customMutationBasicWithArgs types", () => {
      expectTypeOfRegisteredMutationArgs(
        customFunctions.customMutationBasicWithArgs,
      ).toEqualTypeOf<{
        message: string
      }>()
      expectTypeOfRegisteredMutationReturns(
        customFunctions.customMutationBasicWithArgs,
      ).toEqualTypeOf<Promise<string>>()
    })

    test("customMutationBasicWithDbWrite types", () => {
      expectTypeOfRegisteredMutationArgs(
        customFunctions.customMutationBasicWithDbWrite,
      ).toEqualTypeOf<{
        name: string
      }>()
      expectTypeOfRegisteredMutationReturns(
        customFunctions.customMutationBasicWithDbWrite,
      ).toEqualTypeOf<Promise<Id<"items">>>()
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

    test("customMutationWithExtraArgs types", () => {
      expectTypeOfRegisteredMutationArgs(
        customFunctions.customMutationWithExtraArgs,
      ).toEqualTypeOf<{
        optionalToken?: string | undefined
      }>()
      expectTypeOfRegisteredMutationReturns(
        customFunctions.customMutationWithExtraArgs,
      ).toEqualTypeOf<Promise<string>>()
    })

    test("customMutationWithMergedArgs types", () => {
      expectTypeOfRegisteredMutationArgs(
        customFunctions.customMutationWithMergedArgs,
      ).toEqualTypeOf<{
        optionalToken?: string | undefined
        name: string
      }>()
      expectTypeOfRegisteredMutationReturns(
        customFunctions.customMutationWithMergedArgs,
      ).toEqualTypeOf<Promise<string>>()
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

    test("customMutationWithInputAddedArgs types", () => {
      expectTypeOfRegisteredMutationArgs(
        customFunctions.customMutationWithInputAddedArgs,
      ).toEqualTypeOf<{}>()
      expectTypeOfRegisteredMutationReturns(
        customFunctions.customMutationWithInputAddedArgs,
      ).toEqualTypeOf<Promise<{serverTimestamp: number; requestId: "req-123"}>>()
    })

    test("customMutationWithInputAndHandlerArgs types", () => {
      expectTypeOfRegisteredMutationArgs(
        customFunctions.customMutationWithInputAndHandlerArgs,
      ).toEqualTypeOf<{
        clientData: string
      }>()
      expectTypeOfRegisteredMutationReturns(
        customFunctions.customMutationWithInputAndHandlerArgs,
      ).toEqualTypeOf<
        Promise<{serverTimestamp: number; requestId: "req-123"; clientData: string}>
      >()
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

    test("customMutationWithCustomContext types", () => {
      expectTypeOfRegisteredMutationArgs(
        customFunctions.customMutationWithCustomContext,
      ).toEqualTypeOf<{
        contextValue: string
      }>()
      expectTypeOfRegisteredMutationReturns(
        customFunctions.customMutationWithCustomContext,
      ).toEqualTypeOf<Promise<string>>()
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

    test("customMutationWithLayer types", () => {
      expectTypeOfRegisteredMutationArgs(customFunctions.customMutationWithLayer).toEqualTypeOf<{
        token?: string | undefined
      }>()
      expectTypeOfRegisteredMutationReturns(customFunctions.customMutationWithLayer).toEqualTypeOf<
        Promise<string>
      >()
    })

    test("customMutationWithMultipleLayers types", () => {
      expectTypeOfRegisteredMutationArgs(
        customFunctions.customMutationWithMultipleLayers,
      ).toEqualTypeOf<{
        token?: string | undefined
        userId?: string | undefined
        role?: string | undefined
      }>()
      expectTypeOfRegisteredMutationReturns(
        customFunctions.customMutationWithMultipleLayers,
      ).toEqualTypeOf<
        Promise<{token: string; userId: string; role: string; hasTimestamp: boolean}>
      >()
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

    test("customMutationInputErrorSuccess types", () => {
      expectTypeOfRegisteredMutationArgs(
        customFunctions.customMutationInputErrorSuccess,
      ).toEqualTypeOf<{
        shouldFail: boolean
      }>()
      expectTypeOfRegisteredMutationReturns(
        customFunctions.customMutationInputErrorSuccess,
      ).toEqualTypeOf<Promise<string>>()
    })

    test("customMutationInputErrorFail types", () => {
      expectTypeOfRegisteredMutationArgs(
        customFunctions.customMutationInputErrorFail,
      ).toEqualTypeOf<{
        shouldFail: boolean
      }>()
      expectTypeOfRegisteredMutationReturns(
        customFunctions.customMutationInputErrorFail,
      ).toEqualTypeOf<Promise<string>>()
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

    test("customMutationHandlerError types", () => {
      expectTypeOfRegisteredMutationArgs(customFunctions.customMutationHandlerError).toEqualTypeOf<{
        shouldFail: boolean
      }>()
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

    test("customMutationAuthenticated types", () => {
      expectTypeOfRegisteredMutationArgs(
        customFunctions.customMutationAuthenticated,
      ).toEqualTypeOf<{
        sessionToken?: string | undefined
      }>()
      expectTypeOfRegisteredMutationReturns(
        customFunctions.customMutationAuthenticated,
      ).toEqualTypeOf<Promise<{userId: string; role: string; authenticatedUserId: string}>>()
    })

    test("customMutationAuthenticatedWithWrite types", () => {
      expectTypeOfRegisteredMutationArgs(
        customFunctions.customMutationAuthenticatedWithWrite,
      ).toEqualTypeOf<{
        sessionToken?: string | undefined
        itemName: string
      }>()
      expectTypeOfRegisteredMutationReturns(
        customFunctions.customMutationAuthenticatedWithWrite,
      ).toEqualTypeOf<Promise<{id: Id<"items">; userId: string}>>()
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

    test("customMutationComplex types", () => {
      expectTypeOfRegisteredMutationArgs(customFunctions.customMutationComplex).toEqualTypeOf<{
        sessionToken?: string | undefined
        optionalMetadata?: string | undefined
        mutationParam: string
        itemName: string
      }>()
      expectTypeOfRegisteredMutationReturns(customFunctions.customMutationComplex).toEqualTypeOf<
        Promise<{
          token: string
          userId: string
          role: string
          hasTimestamp: boolean
          requestId: `req-${number}`
          metadata: string
          mutationParam: string
          itemCount: number
          itemId: Id<"items">
        }>
      >()
    })
  })
})

describe("customAction", () => {
  describe("Basic usage without input overrides", () => {
    it("should execute basic action without args", async () => {
      const t = setup()

      const result = await t.action(api.functions.customFunctions.customActionBasic, {})

      expect(result).toBe("basic action result")
    })

    it("should pass handler args correctly", async () => {
      const t = setup()

      const result = await t.action(api.functions.customFunctions.customActionBasicWithArgs, {
        message: "hello world",
      })

      expect(result).toBe("received: hello world")
    })

    it("should allow ActionCtx access", async () => {
      const t = setup()

      const result = await t.action(
        api.functions.customFunctions.customActionBasicWithCtxAccess,
        {},
      )

      expect(result).toBe("anonymous")
    })

    test("customActionBasic types", () => {
      expectTypeOfRegisteredActionArgs(customFunctions.customActionBasic).toEqualTypeOf<{}>()
      expectTypeOfRegisteredActionReturns(customFunctions.customActionBasic).toEqualTypeOf<
        Promise<string>
      >()
    })

    test("customActionBasicWithArgs types", () => {
      expectTypeOfRegisteredActionArgs(customFunctions.customActionBasicWithArgs).toEqualTypeOf<{
        message: string
      }>()
      expectTypeOfRegisteredActionReturns(customFunctions.customActionBasicWithArgs).toEqualTypeOf<
        Promise<string>
      >()
    })

    test("customActionBasicWithCtxAccess types", () => {
      expectTypeOfRegisteredActionArgs(
        customFunctions.customActionBasicWithCtxAccess,
      ).toEqualTypeOf<{}>()
      expectTypeOfRegisteredActionReturns(
        customFunctions.customActionBasicWithCtxAccess,
      ).toEqualTypeOf<Promise<string>>()
    })
  })

  describe("Extra args merged with handler args", () => {
    it("should accept extra args in API call", async () => {
      const t = setup()

      const result = await t.action(api.functions.customFunctions.customActionWithExtraArgs, {
        optionalToken: "my-token",
      })

      expect(result).toBe("extra args accepted")
    })

    it("should accept optional extra args", async () => {
      const t = setup()

      const result = await t.action(api.functions.customFunctions.customActionWithExtraArgs, {})

      expect(result).toBe("extra args accepted")
    })

    it("should merge extra args with handler args", async () => {
      const t = setup()

      const result = await t.action(api.functions.customFunctions.customActionWithMergedArgs, {
        optionalToken: "token-123",
        name: "Test Name",
      })

      expect(result).toBe("name: Test Name")
    })

    test("customActionWithExtraArgs types", () => {
      expectTypeOfRegisteredActionArgs(customFunctions.customActionWithExtraArgs).toEqualTypeOf<{
        optionalToken?: string | undefined
      }>()
      expectTypeOfRegisteredActionReturns(customFunctions.customActionWithExtraArgs).toEqualTypeOf<
        Promise<string>
      >()
    })

    test("customActionWithMergedArgs types", () => {
      expectTypeOfRegisteredActionArgs(customFunctions.customActionWithMergedArgs).toEqualTypeOf<{
        optionalToken?: string | undefined
        name: string
      }>()
      expectTypeOfRegisteredActionReturns(customFunctions.customActionWithMergedArgs).toEqualTypeOf<
        Promise<string>
      >()
    })
  })

  describe("Input function adding args", () => {
    it("should provide input-added args to handler", async () => {
      const t = setup()

      const result = await t.action(
        api.functions.customFunctions.customActionWithInputAddedArgs,
        {},
      )

      expect(result).toHaveProperty("serverTimestamp")
      expect(result).toHaveProperty("requestId", "req-123")
      expect(typeof result.serverTimestamp).toBe("number")
    })

    it("should merge input args with handler args", async () => {
      const t = setup()

      const result = await t.action(
        api.functions.customFunctions.customActionWithInputAndHandlerArgs,
        {clientData: "client-value"},
      )

      expect(result).toHaveProperty("serverTimestamp")
      expect(result).toHaveProperty("requestId", "req-123")
      expect(result).toHaveProperty("clientData", "client-value")
    })

    test("customActionWithInputAddedArgs types", () => {
      expectTypeOfRegisteredActionArgs(
        customFunctions.customActionWithInputAddedArgs,
      ).toEqualTypeOf<{}>()
      expectTypeOfRegisteredActionReturns(
        customFunctions.customActionWithInputAddedArgs,
      ).toEqualTypeOf<Promise<{serverTimestamp: number; requestId: "req-123"}>>()
    })

    test("customActionWithInputAndHandlerArgs types", () => {
      expectTypeOfRegisteredActionArgs(
        customFunctions.customActionWithInputAndHandlerArgs,
      ).toEqualTypeOf<{
        clientData: string
      }>()
      expectTypeOfRegisteredActionReturns(
        customFunctions.customActionWithInputAndHandlerArgs,
      ).toEqualTypeOf<
        Promise<{serverTimestamp: number; requestId: "req-123"; clientData: string}>
      >()
    })
  })

  describe("Input function providing custom context", () => {
    it("should use custom context in handler", async () => {
      const t = setup()

      const result = await t.action(api.functions.customFunctions.customActionWithCustomContext, {
        contextValue: "hello",
      })

      expect(result).toBe("HELLO")
    })

    test("customActionWithCustomContext types", () => {
      expectTypeOfRegisteredActionArgs(
        customFunctions.customActionWithCustomContext,
      ).toEqualTypeOf<{
        contextValue: string
      }>()
      expectTypeOfRegisteredActionReturns(
        customFunctions.customActionWithCustomContext,
      ).toEqualTypeOf<Promise<string>>()
    })
  })

  describe("Input function injecting layers", () => {
    it("should inject single layer and access it in handler", async () => {
      const t = setup()

      const result = await t.action(api.functions.customFunctions.customActionWithLayer, {
        token: "my-session-token",
      })

      expect(result).toBe("my-session-token")
    })

    it("should handle optional layer values", async () => {
      const t = setup()

      const result = await t.action(api.functions.customFunctions.customActionWithLayer, {})

      expect(result).toBe("no token")
    })

    it("should inject multiple layers", async () => {
      const t = setup()

      const result = await t.action(api.functions.customFunctions.customActionWithMultipleLayers, {
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

    test("customActionWithLayer types", () => {
      expectTypeOfRegisteredActionArgs(customFunctions.customActionWithLayer).toEqualTypeOf<{
        token?: string | undefined
      }>()
      expectTypeOfRegisteredActionReturns(customFunctions.customActionWithLayer).toEqualTypeOf<
        Promise<string>
      >()
    })

    test("customActionWithMultipleLayers types", () => {
      expectTypeOfRegisteredActionArgs(
        customFunctions.customActionWithMultipleLayers,
      ).toEqualTypeOf<{
        token?: string | undefined
        userId?: string | undefined
        role?: string | undefined
      }>()
      expectTypeOfRegisteredActionReturns(
        customFunctions.customActionWithMultipleLayers,
      ).toEqualTypeOf<
        Promise<{token: string; userId: string; role: string; hasTimestamp: boolean}>
      >()
    })
  })

  describe("Error handling in input function", () => {
    it("should succeed when input does not error", async () => {
      const t = setup()

      const result = await t.action(api.functions.customFunctions.customActionInputErrorSuccess, {
        shouldFail: false,
      })

      expect(result).toBe("input succeeded")
    })

    it("should propagate error from input function", async () => {
      const t = setup()

      await expect(
        t.action(api.functions.customFunctions.customActionInputErrorFail, {
          shouldFail: true,
        }),
      ).rejects.toThrow()
    })

    test("customActionInputErrorSuccess types", () => {
      expectTypeOfRegisteredActionArgs(
        customFunctions.customActionInputErrorSuccess,
      ).toEqualTypeOf<{
        shouldFail: boolean
      }>()
      expectTypeOfRegisteredActionReturns(
        customFunctions.customActionInputErrorSuccess,
      ).toEqualTypeOf<Promise<string>>()
    })

    test("customActionInputErrorFail types", () => {
      expectTypeOfRegisteredActionArgs(customFunctions.customActionInputErrorFail).toEqualTypeOf<{
        shouldFail: boolean
      }>()
      expectTypeOfRegisteredActionReturns(customFunctions.customActionInputErrorFail).toEqualTypeOf<
        Promise<string>
      >()
    })
  })

  describe("Error handling in handler", () => {
    it("should succeed when handler does not error", async () => {
      const t = setup()

      const result = await t.action(api.functions.customFunctions.customActionHandlerError, {
        shouldFail: false,
      })

      expect(result).toBe("handler succeeded")
    })

    it("should propagate error from handler", async () => {
      const t = setup()

      await expect(
        t.action(api.functions.customFunctions.customActionHandlerError, {
          shouldFail: true,
        }),
      ).rejects.toThrow()
    })

    test("customActionHandlerError types", () => {
      expectTypeOfRegisteredActionArgs(customFunctions.customActionHandlerError).toEqualTypeOf<{
        shouldFail: boolean
      }>()
    })
  })

  describe("Complex scenario combining all features", () => {
    it("should combine args, input args, and layers", async () => {
      const t = setup()

      const result = await t.action(api.functions.customFunctions.customActionComplex, {
        optionalMetadata: "custom-metadata",
        actionParam: "action-value",
      })

      expect(result.token).toBe("no token")
      expect(result.userId).toBe("anonymous")
      expect(result.role).toBe("guest")
      expect(result.hasTimestamp).toBe(true)
      expect(result.requestId).toMatch(/^req-\d+$/)
      expect(result.metadata).toBe("custom-metadata")
      expect(result.actionParam).toBe("action-value")
    })

    it("should work with default optional values", async () => {
      const t = setup()

      const result = await t.action(api.functions.customFunctions.customActionComplex, {
        actionParam: "test-param",
      })

      expect(result.token).toBe("no token")
      expect(result.userId).toBe("anonymous")
      expect(result.role).toBe("guest")
      expect(result.hasTimestamp).toBe(true)
      expect(result.requestId).toMatch(/^req-\d+$/)
      expect(result.metadata).toBe("default")
      expect(result.actionParam).toBe("test-param")
    })

    test("customActionComplex types", () => {
      expectTypeOfRegisteredActionArgs(customFunctions.customActionComplex).toEqualTypeOf<{
        optionalMetadata?: string | undefined
        actionParam: string
      }>()
      expectTypeOfRegisteredActionReturns(customFunctions.customActionComplex).toEqualTypeOf<
        Promise<{
          token: string
          userId: string
          role: string
          hasTimestamp: boolean
          requestId: `req-${number}`
          metadata: string
          actionParam: string
        }>
      >()
    })
  })
})
