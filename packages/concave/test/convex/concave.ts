import type {DataModel} from "./_generated/dataModel"

import {
  createActionCtx,
  createMutationCtx,
  createQueryCtx,
  createServerFunctions,
} from "../../src/server"

export const QueryCtx = createQueryCtx<DataModel>()
export const MutationCtx = createMutationCtx<DataModel>()
export const ActionCtx = createActionCtx<DataModel>()

export const {query, internalQuery, mutation, internalMutation, httpAction} = createServerFunctions(
  {
    QueryCtx,
    MutationCtx,
    ActionCtx,
  },
)
