import {defineConfig} from "tsup"

export default defineConfig({
  entry: ["src/assert/index.ts", "src/effect/index.ts", "src/type/index.ts"],
  dts: true,
  sourcemap: true,
  clean: true,
  format: ["esm"],
})
