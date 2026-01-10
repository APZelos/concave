import {defineWorkspace} from "vitest/config"

export default defineWorkspace([
  "packages/concave/vitest.config.ts",
  "packages/helpers/vitest.config.ts",
  "packages/model/vitest.config.ts",
])
