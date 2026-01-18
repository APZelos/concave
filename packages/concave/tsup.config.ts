import {defineConfig} from "tsup"

export default defineConfig({
  entry: ["src/server/index.ts", "src/testing/index.ts"],
  dts: true,
  sourcemap: true,
  clean: true,
  format: ["esm"],
  noExternal: ["@apzelos/concave-internal"],
  external: ["typescript", "effect", "convex", "@effect/vitest"],
})
