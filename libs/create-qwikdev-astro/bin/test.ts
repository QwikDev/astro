import { assert } from "@japa/assert";
import { configure, processCLIArgs, run } from "@japa/runner";
import { TestContext } from "@japa/runner/core";
import { PathTester } from "../src/tester.js";

declare module "@japa/runner/core" {
  interface TestContext {
    path(path: string): PathTester;
  }
}

TestContext.macro("path", function (path: string) {
  return new PathTester(path);
});

processCLIArgs(process.argv.splice(2));

configure({
  files: ["tests/**/*.spec.ts", "src/**/*.test.ts"],
  plugins: [assert()]
});

run();
