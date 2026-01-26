/* eslint-disable @typescript-eslint/no-empty-object-type */
import type {Id} from "../../convex/_generated/dataModel"

import {
  expectTypeOfRegisteredActionArgs,
  expectTypeOfRegisteredActionReturns,
} from "@apzelos/concave-internal/assert"
import {describe, expect, it, test} from "vitest"

import {api, internal} from "../../convex/_generated/api"
import * as actions from "../../convex/functions/actions"
import {setup} from "../../setup"

describe("Actions", () => {
  describe("Function Signatures", () => {
    describe("without args", () => {
      it("should execute without args schema", async () => {
        const t = setup()

        const result = await t.action(api.functions.actions.actionNoArgs, {})

        expect(result).toBe("action no args result")
      })

      it("should return value without returns schema", async () => {
        const t = setup()

        const result = await t.action(api.functions.actions.actionNoArgs, {})

        expect(typeof result).toBe("string")
      })

      it("should validate return value with returns schema", async () => {
        const t = setup()

        const result = await t.action(api.functions.actions.actionNoArgsWithReturns, {})

        expect(result).toBe("validated action return")
        expect(typeof result).toBe("string")
      })

      test("actionNoArgs types", () => {
        expectTypeOfRegisteredActionArgs(actions.actionNoArgs).toEqualTypeOf<{}>()
        expectTypeOfRegisteredActionReturns(actions.actionNoArgs).toEqualTypeOf<Promise<string>>()
      })

      test("actionNoArgsWithReturns types", () => {
        expectTypeOfRegisteredActionArgs(actions.actionNoArgsWithReturns).toEqualTypeOf<{}>()
        expectTypeOfRegisteredActionReturns(actions.actionNoArgsWithReturns).toEqualTypeOf<
          Promise<string>
        >()
      })
    })

    describe("with args", () => {
      it("should accept args matching schema", async () => {
        const t = setup()

        const result = await t.action(api.functions.actions.actionWithArgs, {
          name: "test",
          count: 42,
        })

        expect(result).toBe("action: test: 42")
      })

      it("should reject args not matching schema", async () => {
        const t = setup()

        await expect(
          // @ts-expect-error - intentionally passing invalid args
          t.action(api.functions.actions.actionWithArgs, {name: "test"}),
        ).rejects.toThrow()
      })

      it("should return value with returns schema", async () => {
        const t = setup()

        const result = await t.action(api.functions.actions.actionWithArgsWithReturns, {
          value: 10,
        })

        expect(result).toEqual({quadrupled: 40, original: 10})
      })

      test("actionWithArgs types", () => {
        expectTypeOfRegisteredActionArgs(actions.actionWithArgs).toEqualTypeOf<{
          name: string
          count: number
        }>()
        expectTypeOfRegisteredActionReturns(actions.actionWithArgs).toEqualTypeOf<Promise<string>>()
      })

      test("actionWithArgsWithReturns types", () => {
        expectTypeOfRegisteredActionArgs(actions.actionWithArgsWithReturns).toEqualTypeOf<{
          value: number
        }>()
        expectTypeOfRegisteredActionReturns(actions.actionWithArgsWithReturns).toEqualTypeOf<
          Promise<{quadrupled: number; original: number}>
        >()
      })
    })
  })

  describe("Authentication", () => {
    describe("public actions", () => {
      it("should succeed when unauthenticated", async () => {
        const t = setup()

        const result = await t.action(api.functions.actions.actionNoAuthRequired, {})

        expect(result).toBe("public action")
      })

      it("should succeed when authenticated", async () => {
        const t = setup()
        const authedT = t.withIdentity({
          name: "Test User",
          email: "test@example.com",
          tokenIdentifier: "test-token",
        })

        const result = await authedT.action(api.functions.actions.actionNoAuthRequired, {})

        expect(result).toBe("public action")
      })

      test("actionNoAuthRequired types", () => {
        expectTypeOfRegisteredActionArgs(actions.actionNoAuthRequired).toEqualTypeOf<{}>()
        expectTypeOfRegisteredActionReturns(actions.actionNoAuthRequired).toEqualTypeOf<
          Promise<string>
        >()
      })
    })

    describe("auth-required actions", () => {
      it("should fail when unauthenticated", async () => {
        const t = setup()

        await expect(t.action(api.functions.actions.actionAuthRequired, {})).rejects.toThrow()
      })

      it("should succeed when authenticated", async () => {
        const t = setup()
        const authedT = t.withIdentity({
          name: "Test User",
          email: "test@example.com",
          tokenIdentifier: "test-token",
        })

        const result = await authedT.action(api.functions.actions.actionAuthRequired, {})

        expect(result).toEqual({
          tokenIdentifier: "test-token",
          name: "Test User",
        })
      })

      it("should provide identity to handler", async () => {
        const t = setup()
        const authedT = t.withIdentity({
          name: "Auth User",
          email: "auth@example.com",
          tokenIdentifier: "auth-token-789",
        })

        const identity = await authedT.action(api.functions.actions.actionGetIdentity, {})

        expect(identity).toBeDefined()
        expect(identity?.tokenIdentifier).toBe("auth-token-789")
        expect(identity?.name).toBe("Auth User")
      })

      test("actionAuthRequired types", () => {
        expectTypeOfRegisteredActionArgs(actions.actionAuthRequired).toEqualTypeOf<{}>()
        expectTypeOfRegisteredActionReturns(actions.actionAuthRequired).toEqualTypeOf<
          Promise<{tokenIdentifier: string; name: string | undefined}>
        >()
      })

      test("actionGetIdentity types", () => {
        expectTypeOfRegisteredActionArgs(actions.actionGetIdentity).toEqualTypeOf<{}>()
        // Use toMatchTypeOf since UserIdentity has many optional fields
        expectTypeOfRegisteredActionReturns(actions.actionGetIdentity).toMatchTypeOf<
          Promise<{tokenIdentifier: string} | null>
        >()
      })
    })
  })

  describe("Error Handling", () => {
    it("should propagate TaggedError from handler", async () => {
      const t = setup()

      await expect(
        t.action(api.functions.actions.actionThrowsTaggedError, {message: "test error"}),
      ).rejects.toThrow()
    })

    it("should propagate regular Error from handler", async () => {
      const t = setup()

      await expect(
        t.action(api.functions.actions.actionThrowsRegularError, {message: "regular error"}),
      ).rejects.toThrow("regular error")
    })

    test("actionThrowsTaggedError types", () => {
      expectTypeOfRegisteredActionArgs(actions.actionThrowsTaggedError).toEqualTypeOf<{
        message: string
      }>()
    })

    test("actionThrowsRegularError types", () => {
      expectTypeOfRegisteredActionArgs(actions.actionThrowsRegularError).toEqualTypeOf<{
        message: string
      }>()
    })
  })

  describe("Cross-Function Calls", () => {
    it("should call query via runQuery", async () => {
      const t = setup()

      const result = await t.action(api.functions.actions.actionCallsQuery, {value: 5})

      expect(result).toBe("action called query: internal: 10")
    })

    it("should call mutation via runMutation", async () => {
      const t = setup()

      const id = await t.action(api.functions.actions.actionCallsMutation, {
        name: "Created via action",
      })

      expect(id).toBeDefined()
      expect(typeof id).toBe("string")

      // Verify the item was created
      const item = await t.mutation(api.functions.mutations.mutationGet, {id})
      expect(item?.name).toBe("Created via action")
    })

    it("should call action via runAction", async () => {
      const t = setup()

      const result = await t.action(api.functions.actions.actionCallsAction, {value: 3})

      expect(result).toBe("action called action: internal action: 12")
    })

    test("actionCallsQuery types", () => {
      expectTypeOfRegisteredActionArgs(actions.actionCallsQuery).toEqualTypeOf<{value: number}>()
      expectTypeOfRegisteredActionReturns(actions.actionCallsQuery).toEqualTypeOf<Promise<string>>()
    })

    test("actionCallsMutation types", () => {
      expectTypeOfRegisteredActionArgs(actions.actionCallsMutation).toEqualTypeOf<{name: string}>()
      expectTypeOfRegisteredActionReturns(actions.actionCallsMutation).toEqualTypeOf<
        Promise<Id<"items">>
      >()
    })

    test("actionCallsAction types", () => {
      expectTypeOfRegisteredActionArgs(actions.actionCallsAction).toEqualTypeOf<{value: number}>()
      expectTypeOfRegisteredActionReturns(actions.actionCallsAction).toEqualTypeOf<
        Promise<string>
      >()
    })
  })

  describe("External HTTP", () => {
    // Note: External fetch in convex-test environment may behave differently
    // These tests verify the action can make HTTP requests
    it.skip("should fetch external URL", async () => {
      const t = setup()

      const result = await t.action(api.functions.actions.actionFetchExternal, {
        url: "https://httpbin.org/status/200",
      })

      expect(result.status).toBe(200)
      expect(result.ok).toBe(true)
    })

    it.skip("should handle HTTP errors", async () => {
      const t = setup()

      const result = await t.action(api.functions.actions.actionFetchExternal, {
        url: "https://httpbin.org/status/404",
      })

      expect(result.status).toBe(404)
      expect(result.ok).toBe(false)
    })

    test("actionFetchExternal types", () => {
      expectTypeOfRegisteredActionArgs(actions.actionFetchExternal).toEqualTypeOf<{url: string}>()
      expectTypeOfRegisteredActionReturns(actions.actionFetchExternal).toEqualTypeOf<
        Promise<{status: number; ok: boolean}>
      >()
    })
  })

  describe("Internal Actions", () => {
    it("should be callable directly", async () => {
      const t = setup()

      const result = await t.action(internal.functions.actions.internalActionNoArgs, {})

      expect(result).toBe("internal action no args")
    })

    it("should work without args", async () => {
      const t = setup()

      const result = await t.action(internal.functions.actions.internalActionNoArgs, {})

      expect(typeof result).toBe("string")
    })

    it("should work with args", async () => {
      const t = setup()

      const result = await t.action(internal.functions.actions.internalActionWithArgs, {
        value: 7,
      })

      expect(result).toBe("internal action: 28")
    })

    test("internalActionNoArgs types", () => {
      expectTypeOfRegisteredActionArgs(actions.internalActionNoArgs).toEqualTypeOf<{}>()
      expectTypeOfRegisteredActionReturns(actions.internalActionNoArgs).toEqualTypeOf<
        Promise<string>
      >()
    })

    test("internalActionWithArgs types", () => {
      expectTypeOfRegisteredActionArgs(actions.internalActionWithArgs).toEqualTypeOf<{
        value: number
      }>()
      expectTypeOfRegisteredActionReturns(actions.internalActionWithArgs).toEqualTypeOf<
        Promise<string>
      >()
    })
  })

  describe("Schema Transformations", () => {
    describe("args transformations", () => {
      it("should decode multiple transformations in action args", async () => {
        const t = setup()
        const isoDate = "2024-01-15T10:30:00.000Z"

        const result = await t.action(api.functions.actions.actionWithTransformations, {
          count: "5",
          timestamp: isoDate,
        })

        expect(result).toEqual({
          doubled: 10,
          year: 2024,
        })
      })

      test("actionWithTransformations types", () => {
        expectTypeOfRegisteredActionArgs(actions.actionWithTransformations).toEqualTypeOf<{
          count: string
          timestamp: string
        }>()
        expectTypeOfRegisteredActionReturns(actions.actionWithTransformations).toEqualTypeOf<
          Promise<{doubled: number; year: number}>
        >()
      })
    })

    describe("returns transformations", () => {
      it("should decode NumberFromString - handler returns string, client receives number", async () => {
        const t = setup()

        const result = await t.action(api.functions.actions.actionReturnsWithTransformation, {
          value: 21,
        })

        expect(typeof result.result).toBe("number")
        expect(result.result).toBe(42)
      })

      test("actionReturnsWithTransformation types", () => {
        expectTypeOfRegisteredActionArgs(actions.actionReturnsWithTransformation).toEqualTypeOf<{
          value: number
        }>()
        expectTypeOfRegisteredActionReturns(actions.actionReturnsWithTransformation).toEqualTypeOf<
          Promise<{result: number}>
        >()
      })
    })
  })
})
