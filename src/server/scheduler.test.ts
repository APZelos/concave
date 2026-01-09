import type {GenericId} from "convex/values"

import {describe, expect, expectTypeOf, it, test, vi} from "@effect/vitest"
import {Effect as E} from "effect"

import {mockFunctionReference, mockGenericId, mockScheduler} from "src/test/mock"

describe("Scheduler", () => {
  describe("runAfter", () => {
    test("should have correct type signature", () => {
      const scheduler = mockScheduler()

      expectTypeOf(
        scheduler.runAfter(1000, mockFunctionReference<"action", "public">()),
      ).toEqualTypeOf<E.Effect<GenericId<"_scheduled_functions">, never, never>>()

      expectTypeOf(
        scheduler.runAfter(1000, mockFunctionReference<"mutation", "internal", {arg: string}>(), {
          arg: "some value",
        }),
      ).toEqualTypeOf<E.Effect<GenericId<"_scheduled_functions">, never, never>>()
    })

    it.effect("should return the scheduled function's ID", () =>
      E.gen(function* () {
        const id = mockGenericId("_scheduled_functions", "scheduled-function-id")
        const runAfterMock = vi.fn().mockResolvedValue(id)
        const scheduler = mockScheduler({
          runAfter: runAfterMock,
        })
        const funcRef = mockFunctionReference<"action", "public">()

        const actual = yield* scheduler.runAfter(1000, funcRef)

        expectTypeOf(actual).toEqualTypeOf<GenericId<"_scheduled_functions">>()
        expect(actual).toBe(id)
        expect(runAfterMock).toHaveBeenCalledWith(1000, funcRef)
      }),
    )

    it.effect("should pass arguments to the scheduled function", () =>
      E.gen(function* () {
        const id = mockGenericId("_scheduled_functions", "scheduled-function-id")
        const runAfterMock = vi.fn().mockResolvedValue(id)
        const scheduler = mockScheduler({
          runAfter: runAfterMock,
        })
        const funcRef = mockFunctionReference<"mutation", "internal", {arg: string}>()

        yield* scheduler.runAfter(1000, funcRef, {arg: "test-value"})

        expect(runAfterMock).toHaveBeenCalledWith(1000, funcRef, {arg: "test-value"})
      }),
    )
  })

  describe("runAt", () => {
    test("should have correct type signature", () => {
      const scheduler = mockScheduler()

      expectTypeOf(
        scheduler.runAt(Date.now(), mockFunctionReference<"action", "public">()),
      ).toEqualTypeOf<E.Effect<GenericId<"_scheduled_functions">, never, never>>()

      expectTypeOf(
        scheduler.runAt(
          new Date(),
          mockFunctionReference<"mutation", "internal", {arg: string}>(),
          {
            arg: "some value",
          },
        ),
      ).toEqualTypeOf<E.Effect<GenericId<"_scheduled_functions">, never, never>>()
    })

    it.effect("should return the scheduled function's ID", () =>
      E.gen(function* () {
        const id = mockGenericId("_scheduled_functions", "scheduled-function-id")
        const runAtMock = vi.fn().mockResolvedValue(id)
        const scheduler = mockScheduler({
          runAt: runAtMock,
        })
        const funcRef = mockFunctionReference<"action", "public">()
        const timestamp = new Date()

        const actual = yield* scheduler.runAt(timestamp, funcRef)

        expectTypeOf(actual).toEqualTypeOf<GenericId<"_scheduled_functions">>()
        expect(actual).toBe(id)
        expect(runAtMock).toHaveBeenCalledWith(timestamp, funcRef)
      }),
    )

    it.effect("should pass arguments to the scheduled function", () =>
      E.gen(function* () {
        const id = mockGenericId("_scheduled_functions", "scheduled-function-id")
        const runAtMock = vi.fn().mockResolvedValue(id)
        const scheduler = mockScheduler({
          runAt: runAtMock,
        })
        const funcRef = mockFunctionReference<"mutation", "internal", {arg: string}>()

        yield* scheduler.runAt(Date.now(), funcRef, {arg: "test-value"})

        expect(runAtMock).toHaveBeenCalledWith(expect.any(Number), funcRef, {arg: "test-value"})
      }),
    )
  })

  describe("cancel", () => {
    test("should have correct type signature", () => {
      const scheduler = mockScheduler()
      const id = mockGenericId("_scheduled_functions", "scheduled-function-id")

      expectTypeOf(scheduler.cancel(id)).toEqualTypeOf<E.Effect<void, never, never>>()
    })

    it.effect("should complete successfully", () =>
      E.gen(function* () {
        const cancelMock = vi.fn().mockResolvedValue(undefined)
        const scheduler = mockScheduler({
          cancel: cancelMock,
        })
        const id = mockGenericId("_scheduled_functions", "scheduled-function-id")

        const actual = yield* scheduler.cancel(id)

        expectTypeOf(actual).toEqualTypeOf<void>()
        expect(actual).toBeUndefined()
        expect(cancelMock).toHaveBeenCalledWith(id)
      }),
    )
  })
})
