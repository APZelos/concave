import type {UserIdentity} from "convex/server"
import type {Effect as E} from "effect"

import {describe, expectTypeOf, test, vi} from "@effect/vitest"

import {mockAuth} from "src/test/mock"

describe("Auth", () => {
  describe("getUserIdentity", () => {
    test("should have correct type signature", () => {
      const auth = mockAuth({getUserIdentity: vi.fn().mockResolvedValue(null)})
      const actual = auth.getUserIdentity()

      expectTypeOf(actual).toEqualTypeOf<E.Effect<UserIdentity | null, never, never>>()
    })
  })
})
