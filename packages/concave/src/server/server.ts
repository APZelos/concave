import type {
  GenericActionCtx as ConvexGenericActionCtx,
  GenericMutationCtx as ConvexGenericMutationCtx,
  GenericQueryCtx as ConvexGenericQueryCtx,
  DefaultFunctionArgs,
  FunctionVisibility,
  GenericDataModel,
  PublicHttpAction,
  RegisteredAction,
  RegisteredMutation,
  RegisteredQuery,
} from "convex/server"
import type {GenericId} from "convex/values"
import type {Brand} from "effect"
import type {ActionCtxTag, MutationCtxTag, QueryCtxTag} from "./context"

import {
  actionGeneric,
  httpActionGeneric,
  internalActionGeneric,
  internalMutationGeneric,
  internalQueryGeneric,
  mutationGeneric,
  queryGeneric,
} from "convex/server"
import {Effect as E, pipe, Schema as S} from "effect"

import {GenericActionCtx, GenericMutationCtx, GenericQueryCtx, HttpActionCtx} from "./context"
import {mapAstToValidator} from "./values"

/**
 * Create a set of Effect-based Convex function builders.
 *
 * This function returns an object containing query, mutation, action, and HTTP action
 * builders that work with Effect handlers instead of Promise-based handlers.
 *
 * @param args - Configuration containing the Context tags for dependency injection
 * @returns An object with Effect-based function builders
 *
 * @example
 * ```typescript
 * const QueryCtx = createQueryCtx<DataModel>()
 * const MutationCtx = createMutationCtx<DataModel>()
 *
 * const {query, mutation} = createServerFunctions({QueryCtx, MutationCtx})
 *
 * export const getUser = query({
 *   args: S.Struct({id: SDocId("users")}),
 *   handler: E.fn(function* (args) {
 *     const {db} = yield* QueryCtx
 *     return yield* db.get(args.id)
 *   })
 * })
 * ```
 */
export function createServerFunctions<DataModel extends GenericDataModel>({
  QueryCtx,
  MutationCtx,
  ActionCtx,
}: {
  QueryCtx: QueryCtxTag<DataModel>
  MutationCtx: MutationCtxTag<DataModel>
  ActionCtx: ActionCtxTag<DataModel>
}) {
  const query: QueryBuilder<"public", DataModel> = (query) =>
    queryGeneric(createQueryHandler(QueryCtx, query))

  const internalQuery: QueryBuilder<"internal", DataModel> = (query) =>
    internalQueryGeneric(createQueryHandler(QueryCtx, query))

  const mutation: MutationBuilder<"public", DataModel> = (mutation) =>
    mutationGeneric(createMutationHandler(QueryCtx, MutationCtx, mutation))

  const internalMutation: MutationBuilder<"internal", DataModel> = (mutation) =>
    internalMutationGeneric(createMutationHandler(QueryCtx, MutationCtx, mutation))

  const action: ActionBuilder<"public", DataModel> = (action) =>
    actionGeneric(createActionHandler(ActionCtx, action))

  const internalAction: ActionBuilder<"internal", DataModel> = (action) =>
    internalActionGeneric(createActionHandler(ActionCtx, action))

  /**
   * Define an HTTP action.
   *
   * This function will be used to respond to HTTP requests received by a Convex
   * deployment if the requests matches the path and method where this action
   * is routed. Be sure to route your action in `convex/http.js`.
   *
   * The handler returns an Effect that can be composed using functional combinators.
   *
   * @param func - The function handler that returns an Effect<Response>. Access services through `yield* HttpActionCtx` or your custom ActionCtx.
   * @returns The wrapped function. Import this function from `convex/http.js` and route it to hook it up.
   */
  function httpAction<TError = never>(
    func: (request: Request) => E.Effect<Response, TError, GenericActionCtx<GenericDataModel>>,
  ): PublicHttpAction {
    return httpActionGeneric(
      async (ctx: ConvexGenericActionCtx<GenericDataModel>, request: Request) => {
        return pipe(
          func(request),
          E.provideService(HttpActionCtx, new GenericActionCtx<GenericDataModel>(ctx)),
          E.runPromise,
        )
      },
    )
  }

  return {query, internalQuery, mutation, internalMutation, action, internalAction, httpAction}
}

function createQueryHandler<
  DataModel extends GenericDataModel,
  SchemaArgs,
  Args extends DefaultFunctionArgs,
  SchemaReturns,
  Returns = never,
  TError = never,
>(
  QueryCtx: QueryCtxTag<DataModel>,
  {
    args,
    returns,
    handler,
  }: {
    args: S.Schema<SchemaArgs, Args>
    returns?: S.Schema<Returns, SchemaReturns>
    handler: (
      args: SchemaArgs,
    ) => E.Effect<SchemaReturns | Returns, TError, GenericQueryCtx<DataModel>>
  },
) {
  return {
    args: mapAstToValidator(args.ast, "encode"),
    returns: returns ? mapAstToValidator(returns.ast, "encode") : undefined,
    handler: async (ctx: ConvexGenericQueryCtx<DataModel>, convexArgs: Args) =>
      pipe(
        convexArgs,
        S.decodeUnknown(args),
        E.orDie,
        E.andThen((decodedArgs) =>
          handler(decodedArgs).pipe(
            E.provideService(QueryCtx, new GenericQueryCtx<DataModel>(ctx)),
          ),
        ),
        E.andThen((result) => (returns ? S.decodeUnknown(returns)(result) : E.succeed(result))),
        E.orDie,
        E.runPromise,
      ),
  }
}

function createMutationHandler<
  DataModel extends GenericDataModel,
  SchemaArgs,
  Args extends DefaultFunctionArgs,
  SchemaReturns,
  Returns = never,
  TError = never,
>(
  QueryCtx: QueryCtxTag<DataModel>,
  MutationCtx: MutationCtxTag<DataModel>,
  {
    args,
    returns,
    handler,
  }: {
    args: S.Schema<SchemaArgs, Args>
    returns?: S.Schema<Returns, SchemaReturns>
    handler: (
      args: SchemaArgs,
    ) => E.Effect<
      SchemaReturns | Returns,
      TError,
      GenericQueryCtx<DataModel> | GenericMutationCtx<DataModel>
    >
  },
) {
  return {
    args: mapAstToValidator(args.ast, "encode"),
    returns: returns ? mapAstToValidator(returns.ast, "encode") : undefined,
    handler: async (ctx: ConvexGenericMutationCtx<DataModel>, convexArgs: Args) =>
      pipe(
        convexArgs,
        S.decodeUnknown(args),
        E.orDie,
        E.andThen((decodedArgs) =>
          handler(decodedArgs).pipe(
            E.provideService(QueryCtx, new GenericQueryCtx<DataModel>(ctx)),
            E.provideService(MutationCtx, new GenericMutationCtx<DataModel>(ctx)),
          ),
        ),
        E.andThen((result) => (returns ? S.decodeUnknown(returns)(result) : E.succeed(result))),
        E.orDie,
        E.runPromise,
      ),
  }
}

function createActionHandler<
  DataModel extends GenericDataModel,
  SchemaArgs,
  Args extends DefaultFunctionArgs,
  SchemaReturns,
  Returns = never,
  TError = never,
>(
  ActionCtx: ActionCtxTag<DataModel>,
  {
    args,
    returns,
    handler,
  }: {
    args: S.Schema<SchemaArgs, Args>
    returns?: S.Schema<Returns, SchemaReturns>
    handler: (
      args: SchemaArgs,
    ) => E.Effect<SchemaReturns | Returns, TError, GenericActionCtx<DataModel>>
  },
) {
  return {
    args: mapAstToValidator(args.ast, "encode"),
    returns: returns ? mapAstToValidator(returns.ast, "encode") : undefined,
    handler: async (ctx: ConvexGenericActionCtx<DataModel>, convexArgs: Args) =>
      pipe(
        convexArgs,
        S.decodeUnknown(args),
        E.orDie,
        E.andThen((decodedArgs) =>
          handler(decodedArgs).pipe(
            E.provideService(ActionCtx, new GenericActionCtx<DataModel>(ctx)),
          ),
        ),
        E.andThen((result) => (returns ? S.decodeUnknown(returns)(result) : E.succeed(result))),
        E.orDie,
        E.runPromise,
      ),
  }
}

type QueryBuilder<Visibility extends FunctionVisibility, DataModel extends GenericDataModel> = <
  SchemaArgs,
  Args extends DefaultFunctionArgs,
  SchemaReturns,
  Returns = never,
  TError = never,
>(
  query:
    | {
        args: S.Schema<SchemaArgs, Args>
        returns: S.Schema<Returns, SchemaReturns>
        handler: (args: SchemaArgs) => E.Effect<SchemaReturns, TError, GenericQueryCtx<DataModel>>
      }
    | {
        args: S.Schema<SchemaArgs, Args>
        handler: (args: SchemaArgs) => E.Effect<Returns, TError, GenericQueryCtx<DataModel>>
      },
) => RegisteredQuery<Visibility, Args, Promise<Returns>>

type MutationBuilder<Visibility extends FunctionVisibility, DataModel extends GenericDataModel> = <
  SchemaArgs,
  Args extends DefaultFunctionArgs,
  SchemaReturns,
  Returns = never,
  TError = never,
>(
  mutation:
    | {
        args: S.Schema<SchemaArgs, Args>
        returns: S.Schema<Returns, SchemaReturns>
        handler: (
          args: SchemaArgs,
        ) => E.Effect<
          SchemaReturns,
          TError,
          GenericQueryCtx<DataModel> | GenericMutationCtx<DataModel>
        >
      }
    | {
        args: S.Schema<SchemaArgs, Args>
        handler: (
          args: SchemaArgs,
        ) => E.Effect<Returns, TError, GenericQueryCtx<DataModel> | GenericMutationCtx<DataModel>>
      },
) => RegisteredMutation<Visibility, Args, Promise<Returns>>

type ActionBuilder<Visibility extends FunctionVisibility, DataModel extends GenericDataModel> = <
  SchemaArgs,
  Args extends DefaultFunctionArgs,
  SchemaReturns,
  Returns = never,
  TError = never,
>(
  action:
    | {
        args: S.Schema<SchemaArgs, Args>
        returns: S.Schema<Returns, SchemaReturns>
        handler: (args: SchemaArgs) => E.Effect<SchemaReturns, TError, GenericActionCtx<DataModel>>
      }
    | {
        args: S.Schema<SchemaArgs, Args>
        handler: (args: SchemaArgs) => E.Effect<Returns, TError, GenericActionCtx<DataModel>>
      },
) => RegisteredAction<Visibility, Args, Promise<Returns>>

/**
 * Recursively makes all properties mutable.
 * Preserves Brand types and GenericId types.
 */
export type DeepMutable<T> =
  T extends Brand.Brand<any> | GenericId<any> ? T
  : [keyof T] extends [never] ? T
  : {-readonly [K in keyof T]: DeepMutable<T[K]>}
