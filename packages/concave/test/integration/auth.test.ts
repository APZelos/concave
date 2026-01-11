import {describe, expect, it} from "vitest"

import {api} from "../convex/_generated/api"
import {setup} from "../setup"

describe("Authentication Operations", () => {
  describe("getUserIdentity", () => {
    it("should return null when not authenticated", async () => {
      const t = setup()

      const identity = await t.query(api.functions.auth.getCurrentUser, {})

      expect(identity).toBeNull()
    })

    it("should return identity when authenticated", async () => {
      const t = setup()

      const authedT = t.withIdentity({
        name: "Test User",
        email: "test@example.com",
        tokenIdentifier: "test-token",
      })

      const identity = await authedT.query(api.functions.auth.getCurrentUser, {})

      expect(identity).toBeDefined()
      expect(identity?.name).toBe("Test User")
      expect(identity?.email).toBe("test@example.com")
    })

    it("should access identity properties correctly", async () => {
      const t = setup()

      const authedT = t.withIdentity({
        name: "Full Identity User",
        email: "full@example.com",
        tokenIdentifier: "full-token",
        issuer: "https://example.com",
        subject: "user123",
      })

      const identity = await authedT.query(api.functions.auth.getCurrentUser, {})

      expect(identity?.tokenIdentifier).toBe("full-token")
      expect(identity?.issuer).toBe("https://example.com")
      expect(identity?.subject).toBe("user123")
    })
  })

  describe("requireAuth", () => {
    it("should throw when not authenticated", async () => {
      const t = setup()

      // TODO: When find a way to declare TaggedErrors that can be converted to ConvexError refactor this!
      await expect(t.query(api.functions.auth.requireAuth, {})).rejects.toThrow(
        "An error has occurred",
      )
    })

    it("should return identity when authenticated", async () => {
      const t = setup()

      const authedT = t.withIdentity({
        name: "Auth Required User",
        tokenIdentifier: "auth-token",
      })

      const identity = await authedT.query(api.functions.auth.requireAuth, {})

      expect(identity).toBeDefined()
      expect(identity?.name).toBe("Auth Required User")
    })
  })
})
