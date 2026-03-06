import { configDefaults, defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@qwik-client-manifest": "/dev/null",
      "@qwik.dev/core/server": "/dev/null"
    }
  },
  test: {
    include: ["libs/qwikdev-astro/tests/unit/**/*.test.ts"],
    exclude: [...configDefaults.exclude, "**/e2e/**"],
    reporters: [
      "verbose",
      ...(process.env.GITHUB_ACTIONS ? ["github-actions"] : [])
    ],
    coverage: {
      provider: "v8",
      reportsDirectory: "./tests/unit/coverage"
    }
  }
});
