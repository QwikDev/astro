import { defineConfig } from "tsup";

export default defineConfig((options) => {
  return {
    format: ["esm", "cjs"],
    clean: true,
    minify: !options.watch,
    dts: true,
    entry: [
      "src/app.ts",
      "src/cli.ts",
      "src/console.ts",
      "src/core.ts",
      "src/index.ts",
      "src/process.ts",
      "src/tester.ts",
      "src/utils.ts"
    ]
  };
});
