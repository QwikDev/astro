import { assert } from "@japa/assert";
import { configure, processCLIArgs, run } from "@japa/runner";

processCLIArgs(process.argv.splice(2));

configure({
  files: ["tests/**/*.spec.ts"],
  plugins: [assert()]
});

run();
