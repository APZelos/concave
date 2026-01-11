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
import type * as functions_users from "../functions/users.js"
import type * as functions_posts from "../functions/posts.js"
import type * as functions_files from "../functions/files.js"
import type * as functions_auth from "../functions/auth.js"
import type * as functions_scheduled from "../functions/scheduled.js"
import type * as functions_context from "../functions/context.js"

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
  "functions/users": typeof functions_users
  "functions/posts": typeof functions_posts
  "functions/files": typeof functions_files
  "functions/auth": typeof functions_auth
  "functions/scheduled": typeof functions_scheduled
  "functions/context": typeof functions_context
}>
declare const fullApiWithMounts: typeof fullApi

export declare const api: FilterApi<typeof fullApiWithMounts, FunctionReference<any, "public">>
export declare const internal: FilterApi<
  typeof fullApiWithMounts,
  FunctionReference<any, "internal">
>

export declare const components: {}
