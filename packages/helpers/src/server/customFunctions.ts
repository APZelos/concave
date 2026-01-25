import type {DeepMutable, LayerAnyNoContext, Prettify} from "@apzelos/concave-internal/type"
import type {
  ActionBuilder,
  ActionCtxTag,
  GenericActionCtx,
  GenericMutationCtx,
  GenericQueryCtx,
  MutationBuilder,
  MutationCtxTag,
  QueryBuilder,
  QueryCtxTag,
} from "@apzelos/concave/server"
import type {
  DefaultFunctionArgs,
  FunctionVisibility,
  GenericDataModel,
  RegisteredAction,
  RegisteredMutation,
  RegisteredQuery,
} from "convex/server"

import {GenericQueryCtx as GenericQueryCtxClass} from "@apzelos/concave/server"
import {Effect as E, Layer, Schema as S} from "effect"

export function customQuery<
  Visibility extends FunctionVisibility,
  DataModel extends GenericDataModel,
  InputArgs,
  QueryExtraArgs extends DefaultFunctionArgs,
  HandlerExtraArgs,
  Layers extends Array<LayerAnyNoContext> = [],
  InputError = never,
>(
  queryBuilder: QueryBuilder<Visibility, DataModel>,
  {
    QueryCtx,
    args: extraArgs,
    input = () => E.succeed({}),
  }: {
    QueryCtx: QueryCtxTag<DataModel>
    args: S.Schema<InputArgs, QueryExtraArgs>
    input?: (args: InputArgs) => E.Effect<
      {
        args?: HandlerExtraArgs
        ctx?: GenericQueryCtx<DataModel>
        layers?: Layers
      },
      InputError,
      GenericQueryCtx<DataModel>
    >
  },
): CustomQueryBuilder<
  Visibility,
  HandlerExtraArgs,
  QueryExtraArgs,
  LayersError<[Layer.Layer<GenericQueryCtx<DataModel>>, ...Layers]>,
  LayersSuccess<[Layer.Layer<GenericQueryCtx<DataModel>>, ...Layers]>
> {
  function customQueryBuilder<
    HandlerArgs,
    QueryArgs extends DefaultFunctionArgs,
    HandlerReturns,
    QueryReturns = never,
    HandlerError = never,
  >(query: {
    args: S.Schema<HandlerArgs & InputArgs, QueryArgs & QueryExtraArgs>
    returns?: S.Schema<QueryReturns, HandlerReturns>
    handler: (
      args: HandlerArgs,
    ) => E.Effect<
      HandlerReturns | QueryReturns,
      HandlerError | LayersError<[Layer.Layer<GenericQueryCtx<DataModel>>, ...Layers]>,
      LayersSuccess<[Layer.Layer<GenericQueryCtx<DataModel>>, ...Layers]>
    >
  }): RegisteredQuery<Visibility, QueryArgs, Promise<HandlerReturns | QueryReturns>> {
    return queryBuilder({
      args: S.extend(query.args, extraArgs),
      handler: E.fn(function* (args: HandlerArgs & InputArgs) {
        const ctx = yield* QueryCtx
        const {
          ctx: customCtx,
          args: customArgs = {},
          layers = [],
        } = yield* input(args).pipe(E.provideService(QueryCtx, ctx))
        const QueryCtxLive = Layer.succeed(QueryCtx, customCtx ?? ctx)
        const mergedArgs = {...customArgs, ...args}
        return yield* query
          .handler(mergedArgs)
          .pipe(E.provide(Layer.mergeAll(QueryCtxLive, ...layers))) as E.Effect<
          HandlerReturns | QueryReturns,
          HandlerError | LayersError<[Layer.Layer<GenericQueryCtx<DataModel>>, ...Layers]>,
          never
        >
      }),
    })
  }

  return customQueryBuilder as CustomQueryBuilder<
    Visibility,
    InputArgs,
    QueryExtraArgs,
    LayersError<[Layer.Layer<GenericQueryCtx<DataModel>>, ...Layers]>,
    LayersSuccess<[Layer.Layer<GenericQueryCtx<DataModel>>, ...Layers]>
  >
}

export type CustomQueryBuilder<
  Visibility extends FunctionVisibility,
  HandlerExtraArgs,
  QueryExtraArgs extends DefaultFunctionArgs,
  HandlerExtraError = never,
  HandlerContext = never,
> = <
  HandlerArgs,
  QueryArgs extends DefaultFunctionArgs,
  HandlerReturns,
  QueryReturns = never,
  HandlerError = never,
>(
  query:
    | {
        args: S.Schema<HandlerArgs, QueryArgs>
        returns: S.Schema<QueryReturns, HandlerReturns>
        handler: (
          args: Prettify<HandlerArgs & HandlerExtraArgs>,
        ) => E.Effect<HandlerReturns, HandlerError | HandlerExtraError, HandlerContext>
      }
    | {
        args: S.Schema<HandlerArgs, QueryArgs>
        handler: (
          args: Prettify<HandlerArgs & HandlerExtraArgs>,
        ) => E.Effect<QueryReturns, HandlerError | HandlerExtraError, HandlerContext>
      },
) => RegisteredQuery<
  Visibility,
  DeepMutable<Prettify<QueryArgs & QueryExtraArgs>>,
  Promise<DeepMutable<QueryReturns>>
>

export function customMutation<
  Visibility extends FunctionVisibility,
  DataModel extends GenericDataModel,
  InputArgs,
  MutationExtraArgs extends DefaultFunctionArgs,
  HandlerExtraArgs,
  Layers extends Array<LayerAnyNoContext> = [],
  InputError = never,
>(
  mutationBuilder: MutationBuilder<Visibility, DataModel>,
  {
    QueryCtx,
    MutationCtx,
    args: extraArgs,
    input = () => E.succeed({}),
  }: {
    QueryCtx: QueryCtxTag<DataModel>
    MutationCtx: MutationCtxTag<DataModel>
    args: S.Schema<InputArgs, MutationExtraArgs>
    input?: (args: InputArgs) => E.Effect<
      {
        args?: HandlerExtraArgs
        ctx?: GenericMutationCtx<DataModel>
        layers?: Layers
      },
      InputError,
      GenericMutationCtx<DataModel>
    >
  },
): CustomMutationBuilder<
  Visibility,
  HandlerExtraArgs,
  MutationExtraArgs,
  LayersError<
    [Layer.Layer<GenericQueryCtx<DataModel>>, Layer.Layer<GenericMutationCtx<DataModel>>, ...Layers]
  >,
  LayersSuccess<
    [Layer.Layer<GenericQueryCtx<DataModel>>, Layer.Layer<GenericMutationCtx<DataModel>>, ...Layers]
  >
> {
  function customMutationBuilder<
    HandlerArgs,
    MutationArgs extends DefaultFunctionArgs,
    HandlerReturns,
    MutationReturns = never,
    HandlerError = never,
  >(mutation: {
    args: S.Schema<HandlerArgs & InputArgs, MutationArgs & MutationExtraArgs>
    returns?: S.Schema<MutationReturns, HandlerReturns>
    handler: (
      args: HandlerArgs,
    ) => E.Effect<
      HandlerReturns | MutationReturns,
      | HandlerError
      | LayersError<
          [
            Layer.Layer<GenericQueryCtx<DataModel>>,
            Layer.Layer<GenericMutationCtx<DataModel>>,
            ...Layers,
          ]
        >,
      LayersSuccess<
        [
          Layer.Layer<GenericQueryCtx<DataModel>>,
          Layer.Layer<GenericMutationCtx<DataModel>>,
          ...Layers,
        ]
      >
    >
  }): RegisteredMutation<Visibility, MutationArgs, Promise<HandlerReturns | MutationReturns>> {
    return mutationBuilder({
      args: S.extend(mutation.args, extraArgs),
      handler: E.fn(function* (args: HandlerArgs & InputArgs) {
        const mutationCtx = yield* MutationCtx
        const {
          ctx: customCtx,
          args: customArgs = {},
          layers = [],
        } = yield* input(args).pipe(E.provideService(MutationCtx, mutationCtx))

        const effectiveCtx = customCtx ?? mutationCtx
        const QueryCtxLive = Layer.succeed(
          QueryCtx,
          new GenericQueryCtxClass(effectiveCtx.convexMutationCtx),
        )
        const MutationCtxLive = Layer.succeed(MutationCtx, effectiveCtx)
        const mergedArgs = {...customArgs, ...args}

        return yield* mutation
          .handler(mergedArgs)
          .pipe(E.provide(Layer.mergeAll(QueryCtxLive, MutationCtxLive, ...layers))) as E.Effect<
          HandlerReturns | MutationReturns,
          | HandlerError
          | LayersError<
              [
                Layer.Layer<GenericQueryCtx<DataModel>>,
                Layer.Layer<GenericMutationCtx<DataModel>>,
                ...Layers,
              ]
            >,
          never
        >
      }),
    })
  }

  return customMutationBuilder as CustomMutationBuilder<
    Visibility,
    InputArgs,
    MutationExtraArgs,
    LayersError<
      [
        Layer.Layer<GenericQueryCtx<DataModel>>,
        Layer.Layer<GenericMutationCtx<DataModel>>,
        ...Layers,
      ]
    >,
    LayersSuccess<
      [
        Layer.Layer<GenericQueryCtx<DataModel>>,
        Layer.Layer<GenericMutationCtx<DataModel>>,
        ...Layers,
      ]
    >
  >
}

export type CustomMutationBuilder<
  Visibility extends FunctionVisibility,
  HandlerExtraArgs,
  MutationExtraArgs extends DefaultFunctionArgs,
  HandlerExtraError = never,
  HandlerContext = never,
> = <
  HandlerArgs,
  MutationArgs extends DefaultFunctionArgs,
  HandlerReturns,
  MutationReturns = never,
  HandlerError = never,
>(
  mutation:
    | {
        args: S.Schema<HandlerArgs, MutationArgs>
        returns: S.Schema<MutationReturns, HandlerReturns>
        handler: (
          args: Prettify<HandlerArgs & HandlerExtraArgs>,
        ) => E.Effect<HandlerReturns, HandlerError | HandlerExtraError, HandlerContext>
      }
    | {
        args: S.Schema<HandlerArgs, MutationArgs>
        handler: (
          args: Prettify<HandlerArgs & HandlerExtraArgs>,
        ) => E.Effect<MutationReturns, HandlerError | HandlerExtraError, HandlerContext>
      },
) => RegisteredMutation<
  Visibility,
  DeepMutable<Prettify<MutationArgs & MutationExtraArgs>>,
  Promise<DeepMutable<MutationReturns>>
>

export function customAction<
  Visibility extends FunctionVisibility,
  DataModel extends GenericDataModel,
  InputArgs,
  ActionExtraArgs extends DefaultFunctionArgs,
  HandlerExtraArgs,
  Layers extends Array<LayerAnyNoContext> = [],
  InputError = never,
>(
  actionBuilder: ActionBuilder<Visibility, DataModel>,
  {
    ActionCtx,
    args: extraArgs,
    input = () => E.succeed({}),
  }: {
    ActionCtx: ActionCtxTag<DataModel>
    args: S.Schema<InputArgs, ActionExtraArgs>
    input?: (args: InputArgs) => E.Effect<
      {
        args?: HandlerExtraArgs
        ctx?: GenericActionCtx<DataModel>
        layers?: Layers
      },
      InputError,
      GenericActionCtx<DataModel>
    >
  },
): CustomActionBuilder<
  Visibility,
  HandlerExtraArgs,
  ActionExtraArgs,
  LayersError<[Layer.Layer<GenericActionCtx<DataModel>>, ...Layers]>,
  LayersSuccess<[Layer.Layer<GenericActionCtx<DataModel>>, ...Layers]>
> {
  function customActionBuilder<
    HandlerArgs,
    ActionArgs extends DefaultFunctionArgs,
    HandlerReturns,
    ActionReturns = never,
    HandlerError = never,
  >(action: {
    args: S.Schema<HandlerArgs & InputArgs, ActionArgs & ActionExtraArgs>
    returns?: S.Schema<ActionReturns, HandlerReturns>
    handler: (
      args: HandlerArgs,
    ) => E.Effect<
      HandlerReturns | ActionReturns,
      HandlerError | LayersError<[Layer.Layer<GenericActionCtx<DataModel>>, ...Layers]>,
      LayersSuccess<[Layer.Layer<GenericActionCtx<DataModel>>, ...Layers]>
    >
  }): RegisteredAction<Visibility, ActionArgs, Promise<HandlerReturns | ActionReturns>> {
    return actionBuilder({
      args: S.extend(action.args, extraArgs),
      handler: E.fn(function* (args: HandlerArgs & InputArgs) {
        const actionCtx = yield* ActionCtx
        const {
          ctx: customCtx,
          args: customArgs = {},
          layers = [],
        } = yield* input(args).pipe(E.provideService(ActionCtx, actionCtx))
        const ActionCtxLive = Layer.succeed(ActionCtx, customCtx ?? actionCtx)
        const mergedArgs = {...customArgs, ...args}
        return yield* action
          .handler(mergedArgs)
          .pipe(E.provide(Layer.mergeAll(ActionCtxLive, ...layers))) as E.Effect<
          HandlerReturns | ActionReturns,
          HandlerError | LayersError<[Layer.Layer<GenericActionCtx<DataModel>>, ...Layers]>,
          never
        >
      }),
    })
  }

  return customActionBuilder as CustomActionBuilder<
    Visibility,
    InputArgs,
    ActionExtraArgs,
    LayersError<[Layer.Layer<GenericActionCtx<DataModel>>, ...Layers]>,
    LayersSuccess<[Layer.Layer<GenericActionCtx<DataModel>>, ...Layers]>
  >
}

export type CustomActionBuilder<
  Visibility extends FunctionVisibility,
  HandlerExtraArgs,
  ActionExtraArgs extends DefaultFunctionArgs,
  HandlerExtraError = never,
  HandlerContext = never,
> = <
  HandlerArgs,
  ActionArgs extends DefaultFunctionArgs,
  HandlerReturns,
  ActionReturns = never,
  HandlerError = never,
>(
  action:
    | {
        args: S.Schema<HandlerArgs, ActionArgs>
        returns: S.Schema<ActionReturns, HandlerReturns>
        handler: (
          args: Prettify<HandlerArgs & HandlerExtraArgs>,
        ) => E.Effect<HandlerReturns, HandlerError | HandlerExtraError, HandlerContext>
      }
    | {
        args: S.Schema<HandlerArgs, ActionArgs>
        handler: (
          args: Prettify<HandlerArgs & HandlerExtraArgs>,
        ) => E.Effect<ActionReturns, HandlerError | HandlerExtraError, HandlerContext>
      },
) => RegisteredAction<
  Visibility,
  DeepMutable<Prettify<ActionArgs & ActionExtraArgs>>,
  Promise<DeepMutable<ActionReturns>>
>

type LayersTuple = readonly [LayerAnyNoContext, ...Array<LayerAnyNoContext>]

type LayersError<Layers extends LayersTuple> = {
  [K in keyof Layers]: Layer.Layer.Error<Layers[K]>
}[number]

type LayersSuccess<Layers extends LayersTuple> = {
  [K in keyof Layers]: Layer.Layer.Success<Layers[K]>
}[number]
