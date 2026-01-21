import type {DataModel} from "./_generated/dataModel"

import {
  createActionCtx,
  createMutationCtx,
  createQueryCtx,
  createServerFunctions,
} from "@apzelos/concave/server"

import schema from "./schema"

export const QueryCtx = createQueryCtx<DataModel>()
export const MutationCtx = createMutationCtx<DataModel>()
export const ActionCtx = createActionCtx<DataModel>()

export {schema}

export const {
  query,
  internalQuery,
  mutation,
  internalMutation,
  action,
  internalAction,
  httpAction,
} = createServerFunctions({
  QueryCtx,
  MutationCtx,
  ActionCtx,
})
