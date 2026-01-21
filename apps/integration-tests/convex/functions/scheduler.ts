import type {Id} from "../_generated/dataModel"

import {SDocId} from "@apzelos/concave/server"
import {Effect as E, Schema as S} from "effect"

import {internal} from "../_generated/api"
import {internalMutation, mutation, MutationCtx, query, QueryCtx} from "../concave"

export const schedulerRunAfter = mutation({
  args: S.Struct({
    delayMs: S.Number,
    type: S.String,
    data: S.Unknown,
  }),
  handler: E.fn(function* (args) {
    const {db, scheduler} = yield* MutationCtx
    const EscheduledId: E.Effect<Id<"_scheduled_functions">> = scheduler.runAfter(
      args.delayMs,
      internal.functions.scheduler.processScheduledTask,
      {type: args.type, data: args.data},
    )
    const scheduledId = yield* EscheduledId
    const EtaskId: E.Effect<Id<"tasks">> = db.insert("tasks", {
      type: args.type,
      status: "pending",
      scheduledId,
      data: args.data,
    })
    return {taskId: yield* EtaskId, scheduledId}
  }),
})

export const schedulerRunAt = mutation({
  args: S.Struct({
    timestamp: S.Number,
    type: S.String,
    data: S.Unknown,
  }),
  handler: E.fn(function* (args) {
    const {db, scheduler} = yield* MutationCtx
    const EscheduledId: E.Effect<Id<"_scheduled_functions">> = scheduler.runAt(
      args.timestamp,
      internal.functions.scheduler.processScheduledTask,
      {type: args.type, data: args.data},
    )
    const scheduledId = yield* EscheduledId
    const EtaskId: E.Effect<Id<"tasks">> = db.insert("tasks", {
      type: args.type,
      status: "pending",
      scheduledId,
      data: args.data,
    })
    return {taskId: yield* EtaskId, scheduledId}
  }),
})

export const schedulerCancel = mutation({
  args: S.Struct({
    scheduledId: SDocId("_scheduled_functions"),
  }),
  handler: E.fn(function* (args) {
    const {scheduler} = yield* MutationCtx
    yield* scheduler.cancel(args.scheduledId)
  }),
})

export const getTask = query({
  args: S.Struct({
    id: SDocId("tasks"),
  }),
  handler: E.fn(function* (args) {
    const {db} = yield* QueryCtx
    return yield* db.get(args.id)
  }),
})

export const listTasksByStatus = query({
  args: S.Struct({
    status: S.Literal("pending", "completed", "cancelled"),
  }),
  handler: E.fn(function* (args) {
    const {db} = yield* QueryCtx
    return yield* db
      .query("tasks")
      .withIndex("by_status", (q) => q.eq("status", args.status))
      .collect()
  }),
})

export const updateTaskStatus = mutation({
  args: S.Struct({
    id: SDocId("tasks"),
    status: S.Literal("pending", "completed", "cancelled"),
  }),
  handler: E.fn(function* (args) {
    const {db} = yield* MutationCtx
    yield* db.patch(args.id, {status: args.status})
  }),
})

export const processScheduledTask = internalMutation({
  args: S.Struct({
    type: S.String,
    data: S.Unknown,
  }),
  handler: E.fn(function* (args) {
    // In a real scenario, this would process the task based on type
    // For testing, we just verify it was called
    return {processed: true, type: args.type, data: args.data}
  }),
})

export const schedulerGetAuthInScheduled = internalMutation({
  args: S.Struct({}),
  handler: E.fn(function* () {
    const {auth} = yield* MutationCtx
    return yield* auth.getUserIdentity()
  }),
})

export const scheduleAuthCheck = mutation({
  args: S.Struct({
    delayMs: S.Number,
  }),
  handler: E.fn(function* (args) {
    const {scheduler} = yield* MutationCtx
    const EscheduledId: E.Effect<Id<"_scheduled_functions">> = scheduler.runAfter(
      args.delayMs,
      internal.functions.scheduler.schedulerGetAuthInScheduled,
      {},
    )
    return yield* EscheduledId
  }),
})

// Explicit type annotations break circular type inference
export const processChainStep = internalMutation({
  args: S.Struct({
    chainId: S.String,
    taskId: SDocId("tasks"),
    currentStep: S.Number,
    totalSteps: S.Number,
  }),
  handler: E.fn(function* (args) {
    const {db, scheduler} = yield* MutationCtx

    yield* db.patch(args.taskId, {status: "completed"})

    if (args.currentStep < args.totalSteps) {
      const nextStep = args.currentStep + 1

      const ENextTaskId: E.Effect<Id<"tasks">> = db.insert("tasks", {
        type: `chain-${args.chainId}-step-${nextStep}`,
        status: "pending",
        data: {chainId: args.chainId, step: nextStep, previousTaskId: args.taskId},
      })
      const nextTaskId = yield* ENextTaskId

      const EScheduled: E.Effect<Id<"_scheduled_functions">> = scheduler.runAfter(
        0,
        internal.functions.scheduler.processChainStep,
        {
          chainId: args.chainId,
          taskId: nextTaskId,
          currentStep: nextStep,
          totalSteps: args.totalSteps,
        },
      )
      yield* EScheduled

      return {step: args.currentStep, completed: true, nextTaskId}
    }

    return {step: args.currentStep, completed: true, chainComplete: true}
  }),
})

export const scheduleChainedTask = mutation({
  args: S.Struct({
    delayMs: S.Number,
    chainId: S.String,
  }),
  handler: E.fn(function* (args) {
    const {db, scheduler} = yield* MutationCtx

    const ETaskId: E.Effect<Id<"tasks">> = db.insert("tasks", {
      type: `chain-${args.chainId}-step-1`,
      status: "pending",
      data: {chainId: args.chainId, step: 1},
    })
    const taskId = yield* ETaskId

    const EScheduledId: E.Effect<Id<"_scheduled_functions">> = scheduler.runAfter(
      args.delayMs,
      internal.functions.scheduler.processChainStep,
      {chainId: args.chainId, taskId, currentStep: 1, totalSteps: 3},
    )
    const scheduledId = yield* EScheduledId

    return {taskId, scheduledId}
  }),
})

export const getChainTasks = query({
  args: S.Struct({
    chainId: S.String,
  }),
  handler: E.fn(function* (args) {
    const {db} = yield* QueryCtx
    const allTasks = yield* db.query("tasks").collect()
    return allTasks.filter((task) => task.type.startsWith(`chain-${args.chainId}`))
  }),
})
