import type {GenericId} from "convex/values"
import type {Brand} from "effect"

export type DeepMutable<T> =
  T extends Brand.Brand<any> | GenericId<any> ? T
  : [keyof T] extends [never] ? T
  : {-readonly [K in keyof T]: DeepMutable<T[K]>}
