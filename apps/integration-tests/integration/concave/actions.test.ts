import {describe, expect, it} from "vitest"

import {api, internal} from "../../convex/_generated/api"
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
    })
  })
})
