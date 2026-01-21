import tsconfigPaths from "vite-tsconfig-paths"
import {defineConfig} from "vitest/config"

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    name: "integration",
    environment: "edge-runtime",
    include: ["integration/**/*.test.ts"],
    server: {deps: {inline: ["convex-test"]}},
  },
})
