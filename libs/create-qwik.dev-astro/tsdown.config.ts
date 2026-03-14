import { defineConfig } from "tsdown";

export default defineConfig((options) => {
  return {
    format: ["esm", "cjs"],
    clean: true,
    minify: !options.watch,
    dts: {
      hashFilename: false
    },
    hashFilename: false,
    entry: [
      "src/app.ts",
      "src/cli.ts",
      "src/console.ts",
      "src/core.ts",
      "src/index.ts",
      "src/tester.ts",
      "src/utils.ts"
    ]
  };
});
