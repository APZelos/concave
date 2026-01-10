import {Effect as E, Option, pipe} from "effect"

export function OptionSucceedOrFail<TError>(onFail: () => TError) {
  function match<A>(option: Option.Option<A>): E.Effect<A, TError> {
    return pipe(
      option,
      Option.match({
        onSome: (value) => E.succeed(value),
        onNone: () => E.fail(onFail()),
      }),
    )
  }

  return match
}
