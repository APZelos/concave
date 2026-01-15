/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as concave from "../concave.js"
import type * as http from "../http.js"
import type * as functions_queries from "../functions/queries.js"
import type * as functions_mutations from "../functions/mutations.js"
import type * as functions_actions from "../functions/actions.js"
import type * as functions_storage from "../functions/storage.js"
import type * as functions_scheduler from "../functions/scheduler.js"

import type {ApiFromModules, FilterApi, FunctionReference} from "convex/server"

/**
 * A utility for referencing Convex functions in your app's API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
declare const fullApi: ApiFromModules<{
  concave: typeof concave
  http: typeof http
  "functions/queries": typeof functions_queries
  "functions/mutations": typeof functions_mutations
  "functions/actions": typeof functions_actions
  "functions/storage": typeof functions_storage
  "functions/scheduler": typeof functions_scheduler
}>
declare const fullApiWithMounts: typeof fullApi

export declare const api: FilterApi<typeof fullApiWithMounts, FunctionReference<any, "public">>
export declare const internal: FilterApi<
  typeof fullApiWithMounts,
  FunctionReference<any, "internal">
>

export declare const components: {}
