import {defineConfig} from "tsup"

export default defineConfig({
  entry: ["src/index.ts", "src/types/index.ts", "src/option.ts"],
  dts: true,
  sourcemap: true,
  clean: true,
  format: ["esm"],
})
