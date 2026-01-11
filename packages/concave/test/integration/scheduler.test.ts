import {describe, expect, it} from "vitest"

import {api, internal} from "../convex/_generated/api"
import {setup} from "../setup"

describe("Scheduler Operations", () => {
  describe("runAfter", () => {
    it("should schedule a task with delay", async () => {
      const t = setup()

      const taskId = await t.mutation(api.functions.scheduled.scheduleTask, {
        delayMs: 1000,
        type: "test-task",
        data: {message: "Hello"},
      })

      expect(taskId).toBeDefined()

      // Verify task was created
      const task = await t.mutation(internal.functions.scheduled.getTask, {taskId})

      expect(task).toBeDefined()
      expect(task?.type).toBe("test-task")
      expect(task?.status).toBe("pending")
      expect(task?.scheduledId).toBeDefined()
    })

    // Note: Scheduled function execution in convex-test requires specific handling
    // This test verifies that scheduling creates the right database state
    it("should create scheduledId when task is scheduled", async () => {
      const t = setup()

      const taskId = await t.mutation(api.functions.scheduled.scheduleTask, {
        delayMs: 1000,
        type: "execute-test",
        data: {value: 42},
      })

      const task = await t.mutation(internal.functions.scheduled.getTask, {taskId})
      expect(task?.status).toBe("pending")
      expect(task?.scheduledId).toBeDefined()
      expect(task?.data).toEqual({value: 42})
    })
  })

  describe("runAt", () => {
    it("should schedule a task at specific time", async () => {
      const t = setup()

      const futureTime = Date.now() + 60000 // 1 minute in the future

      const taskId = await t.mutation(api.functions.scheduled.scheduleTaskAt, {
        timestamp: futureTime,
        type: "scheduled-at-test",
        data: {scheduled: true},
      })

      expect(taskId).toBeDefined()

      const task = await t.mutation(internal.functions.scheduled.getTask, {taskId})

      expect(task).toBeDefined()
      expect(task?.type).toBe("scheduled-at-test")
      expect(task?.status).toBe("pending")
    })
  })

  describe("cancel", () => {
    it("should cancel a scheduled task", async () => {
      const t = setup()

      const taskId = await t.mutation(api.functions.scheduled.scheduleTask, {
        delayMs: 60000, // Long delay so it doesn't run
        type: "cancel-test",
        data: {},
      })

      // Verify task is pending
      const taskBefore = await t.mutation(internal.functions.scheduled.getTask, {taskId})
      expect(taskBefore?.status).toBe("pending")

      // Cancel the task
      await t.mutation(api.functions.scheduled.cancelTask, {taskId})

      // Verify task is cancelled
      const taskAfter = await t.mutation(internal.functions.scheduled.getTask, {taskId})
      expect(taskAfter?.status).toBe("cancelled")
    })

    it("should handle cancelling non-existent task gracefully", async () => {
      const t = setup()

      // Create and complete a task first to get a valid ID format
      const taskId = await t.mutation(api.functions.scheduled.scheduleTask, {
        delayMs: 0,
        type: "temp-task",
        data: {},
      })

      // Complete the task
      await t.finishInProgressScheduledFunctions()

      // Trying to cancel a completed task should not throw
      await t.mutation(api.functions.scheduled.cancelTask, {taskId})
    })
  })
})
