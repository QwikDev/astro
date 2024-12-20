import { configDefaults, defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["./tests/unit/**/*.{test,spec}.ts"],
    exclude: [...configDefaults.exclude, "**/e2e/**"],
    reporters: [
      "default",
      "html",
      "verbose",
      ...(process.env.GITHUB_ACTIONS ? ["github-actions"] : [])
    ],
    outputFile: "./tests/unit/report/html/index.html",
    coverage: {
      provider: "v8",
      reportsDirectory: "./tests/unit/coverage"
    }
  }
});
