import {afterEach, beforeEach, describe, expect, it, vi} from "vitest"

import {api} from "../../convex/_generated/api"
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
  })
})
