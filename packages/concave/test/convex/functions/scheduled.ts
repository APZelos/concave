import type {Id} from "../_generated/dataModel"

import {Effect as E, Schema as S} from "effect"

import {internal} from "../_generated/api"
import {SDocId} from "../../../src/server/values"
import {internalMutation, mutation, MutationCtx} from "../concave"

export const scheduleTask = mutation({
  args: {
    delayMs: S.Number,
    type: S.String,
    data: S.Any,
  },
  handler: E.fn(function* (args) {
    const {db, scheduler} = yield* MutationCtx

    const taskId = yield* db.insert("scheduledTasks", {
      type: args.type,
      status: "pending",
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment -- S.Any intentionally accepts any JSON
      data: args.data,
    })

    const runAfterEffect: E.Effect<Id<"_scheduled_functions">> = scheduler.runAfter(
      args.delayMs,
      internal.functions.scheduled.processTask,
      {taskId},
    )
    const scheduledId = yield* runAfterEffect

    yield* db.patch(taskId, {scheduledId})

    return taskId
  }),
})

export const scheduleTaskAt = mutation({
  args: {
    timestamp: S.Number,
    type: S.String,
    data: S.Any,
  },
  handler: E.fn(function* (args) {
    const {db, scheduler} = yield* MutationCtx

    const taskId = yield* db.insert("scheduledTasks", {
      type: args.type,
      status: "pending",
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment -- S.Any intentionally accepts any JSON
      data: args.data,
    })

    const runAtEffect: E.Effect<Id<"_scheduled_functions">> = scheduler.runAt(
      args.timestamp,
      internal.functions.scheduled.processTask,
      {taskId},
    )
    const scheduledId = yield* runAtEffect

    yield* db.patch(taskId, {scheduledId})

    return taskId
  }),
})

export const cancelTask = mutation({
  args: {
    taskId: SDocId("scheduledTasks"),
  },
  handler: E.fn(function* (args) {
    const {db, scheduler} = yield* MutationCtx
    const task = yield* db.get(args.taskId)

    if (task?.scheduledId) {
      yield* scheduler.cancel(task.scheduledId)
      yield* db.patch(args.taskId, {status: "cancelled"})
    }
  }),
})

export const processTask = internalMutation({
  args: {
    taskId: SDocId("scheduledTasks"),
  },
  handler: E.fn(function* (args) {
    const {db} = yield* MutationCtx
    const task = yield* db.get(args.taskId)

    if (task?.status === "pending") {
      yield* db.patch(args.taskId, {status: "completed"})
    }
  }),
})

export const getTask = internalMutation({
  args: {
    taskId: SDocId("scheduledTasks"),
  },
  handler: E.fn(function* (args) {
    const {db} = yield* MutationCtx
    return yield* db.get(args.taskId)
  }),
})
