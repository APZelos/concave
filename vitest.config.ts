import {defineConfig} from "vitest/config"

export default defineConfig({
  test: {
    projects: [
      "packages/concave/vitest.config.ts",
      "packages/helpers/vitest.config.ts",
      "packages/model/vitest.config.ts",
      "apps/integration-tests/vitest.config.ts",
    ],
  },
})
