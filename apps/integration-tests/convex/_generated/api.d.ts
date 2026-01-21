/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as concave from "../concave.js";
import type * as functions_actions from "../functions/actions.js";
import type * as functions_filter from "../functions/filter.js";
import type * as functions_model from "../functions/model.js";
import type * as functions_mutations from "../functions/mutations.js";
import type * as functions_queries from "../functions/queries.js";
import type * as functions_scheduler from "../functions/scheduler.js";
import type * as functions_storage from "../functions/storage.js";
import type * as functions_stream from "../functions/stream.js";
import type * as http from "../http.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  concave: typeof concave;
  "functions/actions": typeof functions_actions;
  "functions/filter": typeof functions_filter;
  "functions/model": typeof functions_model;
  "functions/mutations": typeof functions_mutations;
  "functions/queries": typeof functions_queries;
  "functions/scheduler": typeof functions_scheduler;
  "functions/storage": typeof functions_storage;
  "functions/stream": typeof functions_stream;
  http: typeof http;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
