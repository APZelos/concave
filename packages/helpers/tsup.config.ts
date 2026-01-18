import {defineConfig} from "tsup"

export default defineConfig({
  entry: ["src/server/filter.ts", "src/server/stream.ts", "src/testing/index.ts"],
  dts: true,
  sourcemap: true,
  clean: true,
  format: ["esm"],
  noExternal: ["@apzelos/concave-internal"],
  external: [
    "typescript",
    "effect",
    "convex",
    "convex-helpers",
    "@apzelos/concave",
    "@effect/vitest",
  ],
})
