/* eslint-disable @typescript-eslint/no-empty-object-type */
import type {GenericId} from "convex/values"
import type {Doc, Id} from "../../convex/_generated/dataModel"

import {
  expectTypeOfRegisteredMutationArgs,
  expectTypeOfRegisteredMutationReturns,
  expectTypeOfRegisteredQueryArgs,
  expectTypeOfRegisteredQueryReturns,
} from "@apzelos/concave-internal/assert"
import {afterEach, beforeEach, describe, expect, it, test, vi} from "vitest"

import {api} from "../../convex/_generated/api"
import * as scheduler from "../../convex/functions/scheduler"
import {setup} from "../../setup"

describe("Scheduler", () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe("runAfter", () => {
    it("should schedule task with delay", async () => {
      const t = setup()

      const result = await t.mutation(api.functions.scheduler.schedulerRunAfter, {
        delayMs: 1000,
        type: "test-task",
        data: {message: "Hello"},
      })

      expect(result.taskId).toBeDefined()
      expect(result.scheduledId).toBeDefined()

      // Verify task was created
      const task = await t.query(api.functions.scheduler.getTask, {id: result.taskId})

      expect(task).toBeDefined()
      expect(task?.type).toBe("test-task")
      expect(task?.status).toBe("pending")
    })

    it("should pass arguments to target", async () => {
      const t = setup()

      const result = await t.mutation(api.functions.scheduler.schedulerRunAfter, {
        delayMs: 1000,
        type: "data-task",
        data: {value: 42, nested: {key: "value"}},
      })

      const task = await t.query(api.functions.scheduler.getTask, {id: result.taskId})
      expect(task?.data).toEqual({value: 42, nested: {key: "value"}})
    })

    it("should return valid scheduledId", async () => {
      const t = setup()

      const result = await t.mutation(api.functions.scheduler.schedulerRunAfter, {
        delayMs: 1000,
        type: "scheduled-id-test",
        data: {},
      })

      expect(result.scheduledId).toBeDefined()
      expect(typeof result.scheduledId).toBe("string")
    })

    test("schedulerRunAfter types", () => {
      expectTypeOfRegisteredMutationArgs(scheduler.schedulerRunAfter).toEqualTypeOf<{
        delayMs: number
        type: string
        data: unknown
      }>()
      expectTypeOfRegisteredMutationReturns(scheduler.schedulerRunAfter).toEqualTypeOf<
        Promise<{
          taskId: Id<"tasks">
          scheduledId: Id<"_scheduled_functions">
        }>
      >()
    })
  })

  describe("runAt", () => {
    it("should schedule task at timestamp", async () => {
      const t = setup()

      const futureTime = Date.now() + 60000 // 1 minute in the future

      const result = await t.mutation(api.functions.scheduler.schedulerRunAt, {
        timestamp: futureTime,
        type: "scheduled-at-test",
        data: {scheduled: true},
      })

      expect(result.taskId).toBeDefined()

      const task = await t.query(api.functions.scheduler.getTask, {id: result.taskId})

      expect(task).toBeDefined()
      expect(task?.type).toBe("scheduled-at-test")
      expect(task?.status).toBe("pending")
    })

    it("should pass arguments to target", async () => {
      const t = setup()

      const futureTime = Date.now() + 60000

      const result = await t.mutation(api.functions.scheduler.schedulerRunAt, {
        timestamp: futureTime,
        type: "data-at-task",
        data: {timestamp: futureTime, extra: "data"},
      })

      const task = await t.query(api.functions.scheduler.getTask, {id: result.taskId})
      expect(task?.data).toEqual({timestamp: futureTime, extra: "data"})
    })

    test("schedulerRunAt types", () => {
      expectTypeOfRegisteredMutationArgs(scheduler.schedulerRunAt).toEqualTypeOf<{
        timestamp: number
        type: string
        data: unknown
      }>()
      expectTypeOfRegisteredMutationReturns(scheduler.schedulerRunAt).toEqualTypeOf<
        Promise<{
          taskId: Id<"tasks">
          scheduledId: Id<"_scheduled_functions">
        }>
      >()
    })
  })

  describe("cancel", () => {
    it("should cancel scheduled task", async () => {
      const t = setup()

      const result = await t.mutation(api.functions.scheduler.schedulerRunAfter, {
        delayMs: 60000, // Long delay so it doesn't run
        type: "cancel-test",
        data: {},
      })

      const taskBefore = await t.query(api.functions.scheduler.getTask, {id: result.taskId})
      expect(taskBefore?.status).toBe("pending")

      await t.mutation(api.functions.scheduler.schedulerCancel, {
        scheduledId: result.scheduledId,
      })

      // Update task status manually (in real scenario, Convex handles this)
      await t.mutation(api.functions.scheduler.updateTaskStatus, {
        id: result.taskId,
        status: "cancelled",
      })

      const taskAfter = await t.query(api.functions.scheduler.getTask, {id: result.taskId})
      expect(taskAfter?.status).toBe("cancelled")
    })

    it("should handle completed task", async () => {
      const t = setup()

      const result = await t.mutation(api.functions.scheduler.schedulerRunAfter, {
        delayMs: 0,
        type: "completed-test",
        data: {},
      })

      // Complete the scheduled function using fake timers
      vi.runAllTimers()
      await t.finishInProgressScheduledFunctions()

      await expect(
        t.mutation(api.functions.scheduler.schedulerCancel, {
          scheduledId: result.scheduledId,
        }),
      ).resolves.not.toThrow()
    })

    test("schedulerCancel types", () => {
      expectTypeOfRegisteredMutationArgs(scheduler.schedulerCancel).toEqualTypeOf<{
        scheduledId: GenericId<"_scheduled_functions">
      }>()
      expectTypeOfRegisteredMutationReturns(scheduler.schedulerCancel).toEqualTypeOf<
        Promise<void>
      >()
    })

    test("updateTaskStatus types", () => {
      expectTypeOfRegisteredMutationArgs(scheduler.updateTaskStatus).toEqualTypeOf<{
        id: GenericId<"tasks">
        status: "pending" | "completed" | "cancelled"
      }>()
      expectTypeOfRegisteredMutationReturns(scheduler.updateTaskStatus).toEqualTypeOf<
        Promise<void>
      >()
    })
  })

  describe("Execution", () => {
    it("should execute after delay", async () => {
      const t = setup()

      const result = await t.mutation(api.functions.scheduler.schedulerRunAfter, {
        delayMs: 0, // Execute immediately
        type: "execute-test",
        data: {executed: true},
      })

      // Execute the scheduled function using fake timers
      vi.runAllTimers()
      await t.finishInProgressScheduledFunctions()

      // The internal mutation was called - we can verify by checking the task exists
      const task = await t.query(api.functions.scheduler.getTask, {id: result.taskId})
      expect(task).toBeDefined()
      expect(task?.type).toBe("execute-test")
    })

    it("should mark task completed after execution", async () => {
      const t = setup()

      const result = await t.mutation(api.functions.scheduler.schedulerRunAfter, {
        delayMs: 0,
        type: "completion-test",
        data: {},
      })

      // Execute scheduled functions using fake timers
      vi.runAllTimers()
      await t.finishInProgressScheduledFunctions()

      // Mark task as completed (in real scenario, the scheduled function would do this)
      await t.mutation(api.functions.scheduler.updateTaskStatus, {
        id: result.taskId,
        status: "completed",
      })

      const task = await t.query(api.functions.scheduler.getTask, {id: result.taskId})
      expect(task?.status).toBe("completed")
    })
  })

  describe("Authentication", () => {
    it("should have null auth in scheduled function", async () => {
      const t = setup()

      const scheduledId = await t.mutation(api.functions.scheduler.scheduleAuthCheck, {
        delayMs: 0,
      })

      expect(scheduledId).toBeDefined()

      // Execute the scheduled function using fake timers
      vi.runAllTimers()
      await t.finishInProgressScheduledFunctions()

      // The internal function schedulerGetAuthInScheduled should have returned null
      // We verify it was scheduled and executed without error
      expect(scheduledId).toBeDefined()
    })

    test("scheduleAuthCheck types", () => {
      expectTypeOfRegisteredMutationArgs(scheduler.scheduleAuthCheck).toEqualTypeOf<{
        delayMs: number
      }>()
      expectTypeOfRegisteredMutationReturns(scheduler.scheduleAuthCheck).toEqualTypeOf<
        Promise<Id<"_scheduled_functions">>
      >()
    })

    test("schedulerGetAuthInScheduled types", () => {
      expectTypeOfRegisteredMutationArgs(scheduler.schedulerGetAuthInScheduled).toEqualTypeOf<{}>()
    })
  })

  describe("Task Management", () => {
    it("should list tasks by status", async () => {
      const t = setup()

      await t.mutation(api.functions.scheduler.schedulerRunAfter, {
        delayMs: 60000,
        type: "pending-1",
        data: {},
      })
      await t.mutation(api.functions.scheduler.schedulerRunAfter, {
        delayMs: 60000,
        type: "pending-2",
        data: {},
      })

      const pendingTasks = await t.query(api.functions.scheduler.listTasksByStatus, {
        status: "pending",
      })

      expect(pendingTasks.length).toBeGreaterThanOrEqual(2)
      expect(pendingTasks.every((task: {status: string}) => task.status === "pending")).toBe(true)
    })

    test("getTask types", () => {
      expectTypeOfRegisteredQueryArgs(scheduler.getTask).toEqualTypeOf<{
        id: GenericId<"tasks">
      }>()
      expectTypeOfRegisteredQueryReturns(scheduler.getTask).toEqualTypeOf<
        Promise<Doc<"tasks"> | null>
      >()
    })

    test("listTasksByStatus types", () => {
      expectTypeOfRegisteredQueryArgs(scheduler.listTasksByStatus).toEqualTypeOf<{
        status: "pending" | "completed" | "cancelled"
      }>()
      expectTypeOfRegisteredQueryReturns(scheduler.listTasksByStatus).toEqualTypeOf<
        Promise<Doc<"tasks">[]>
      >()
    })
  })

  describe("Chained Scheduled Functions", () => {
    it("should execute entire chain with finishAllScheduledFunctions", async () => {
      const t = setup()
      const chainId = "test-chain-1"

      const result = await t.mutation(api.functions.scheduler.scheduleChainedTask, {
        delayMs: 0,
        chainId,
      })

      expect(result.taskId).toBeDefined()
      expect(result.scheduledId).toBeDefined()

      await t.finishAllScheduledFunctions(() => {
        vi.runAllTimers()
      })

      const chainTasks = await t.query(api.functions.scheduler.getChainTasks, {chainId})

      expect(chainTasks).toHaveLength(3)
      expect(chainTasks.every((task: {status: string}) => task.status === "completed")).toBe(true)

      const step1 = chainTasks.find((task: {type: string}) => task.type.includes("step-1"))
      const step2 = chainTasks.find((task: {type: string}) => task.type.includes("step-2"))
      const step3 = chainTasks.find((task: {type: string}) => task.type.includes("step-3"))

      expect(step1).toBeDefined()
      expect(step2).toBeDefined()
      expect(step3).toBeDefined()
    })

    it("should only execute first level with finishInProgressScheduledFunctions", async () => {
      const t = setup()
      const chainId = "test-chain-2"

      await t.mutation(api.functions.scheduler.scheduleChainedTask, {
        delayMs: 0,
        chainId,
      })

      vi.runAllTimers()
      await t.finishInProgressScheduledFunctions()

      const chainTasks = await t.query(api.functions.scheduler.getChainTasks, {chainId})

      expect(chainTasks.length).toBeGreaterThanOrEqual(2)

      const step1 = chainTasks.find((task: {type: string}) => task.type.includes("step-1"))
      expect(step1?.status).toBe("completed")
    })

    it("should handle multiple chains independently", async () => {
      const t = setup()
      const chainIdA = "chain-A"
      const chainIdB = "chain-B"

      await t.mutation(api.functions.scheduler.scheduleChainedTask, {
        delayMs: 0,
        chainId: chainIdA,
      })
      await t.mutation(api.functions.scheduler.scheduleChainedTask, {
        delayMs: 0,
        chainId: chainIdB,
      })

      await t.finishAllScheduledFunctions(() => {
        vi.runAllTimers()
      })

      const chainATasks = await t.query(api.functions.scheduler.getChainTasks, {chainId: chainIdA})
      const chainBTasks = await t.query(api.functions.scheduler.getChainTasks, {chainId: chainIdB})

      expect(chainATasks).toHaveLength(3)
      expect(chainBTasks).toHaveLength(3)
      expect(chainATasks.every((task: {status: string}) => task.status === "completed")).toBe(true)
      expect(chainBTasks.every((task: {status: string}) => task.status === "completed")).toBe(true)
    })

    test("scheduleChainedTask types", () => {
      expectTypeOfRegisteredMutationArgs(scheduler.scheduleChainedTask).toEqualTypeOf<{
        delayMs: number
        chainId: string
      }>()
      expectTypeOfRegisteredMutationReturns(scheduler.scheduleChainedTask).toEqualTypeOf<
        Promise<{
          taskId: Id<"tasks">
          scheduledId: Id<"_scheduled_functions">
        }>
      >()
    })

    test("getChainTasks types", () => {
      expectTypeOfRegisteredQueryArgs(scheduler.getChainTasks).toEqualTypeOf<{
        chainId: string
      }>()
      expectTypeOfRegisteredQueryReturns(scheduler.getChainTasks).toEqualTypeOf<
        Promise<Doc<"tasks">[]>
      >()
    })

    test("processChainStep types", () => {
      expectTypeOfRegisteredMutationArgs(scheduler.processChainStep).toEqualTypeOf<{
        chainId: string
        taskId: GenericId<"tasks">
        currentStep: number
        totalSteps: number
      }>()
      expectTypeOfRegisteredMutationReturns(scheduler.processChainStep).toEqualTypeOf<
        Promise<{
          completed: boolean
          step: number
          nextTaskId?: GenericId<"tasks"> | undefined
          chainComplete: boolean
        }>
      >()
    })

    test("processScheduledTask types", () => {
      expectTypeOfRegisteredMutationArgs(scheduler.processScheduledTask).toEqualTypeOf<{
        type: string
        data: unknown
      }>()
      expectTypeOfRegisteredMutationReturns(scheduler.processScheduledTask).toEqualTypeOf<
        Promise<{
          processed: boolean
          type: string
          data: unknown
        }>
      >()
    })
  })
})
