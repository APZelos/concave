import type {DeepMutable, LayerAnyNoContext, Prettify} from "@apzelos/concave-internal/types"
import type {GenericQueryCtx, QueryBuilder, QueryCtxTag} from "@apzelos/concave/server"
import type {
  DefaultFunctionArgs,
  FunctionVisibility,
  GenericDataModel,
  RegisteredQuery,
} from "convex/server"

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

type LayersTuple = readonly [LayerAnyNoContext, ...Array<LayerAnyNoContext>]

type LayersError<Layers extends LayersTuple> = {
  [K in keyof Layers]: Layer.Layer.Error<Layers[K]>
}[number]

type LayersSuccess<Layers extends LayersTuple> = {
  [K in keyof Layers]: Layer.Layer.Success<Layers[K]>
}[number]
