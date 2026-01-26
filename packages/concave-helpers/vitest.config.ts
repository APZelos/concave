import tsconfigPaths from "vite-tsconfig-paths"
import {defineConfig} from "vitest/config"

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    name: "@apzelos/concave-helpers",
    environment: "edge-runtime",
    include: ["src/**/*.test.ts"],
    server: {deps: {inline: ["convex-test"]}},
  },
})
