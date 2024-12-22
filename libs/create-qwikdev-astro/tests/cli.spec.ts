import { test } from "@japa/runner";
import app from "@qwikdev/create-astro/app";
import { PathTester } from "@qwikdev/create-astro/tester";
import { emptyDirSync, ensureDirSync } from "fs-extra";

const rootDir = "tests/apps";
const projectName = "test-app";

const generatedFiles = [
  ".vscode/extensions.json",
  ".vscode/launch.json",
  "public/favicon.svg",
  "src/assets/astro.svg",
  "src/assets/qwik.svg",
  "src/components/counter.module.css",
  "src/components/counter.tsx",
  "src/layouts/Layout.astro",
  "src/pages/index.astro",
  "src/styles/global.css",
  "src/env.d.ts",
  ".gitignore",
  "README.md",
  "astro.config.ts",
  "package.json",
  "tsconfig.json"
] as const;

const eslintFiles = [".eslintignore", ".eslintrc.cjs"];

const prettierFiles = [".prettierignore", "prettier.config.cjs"];

const biomeFiles = ["biome.json"];

const dependenciesDir = "node_modules";
const ciFile = ".github/workflows/ci.yml";

enum lockFile {
  npm = "package-lock.json",
  pnpm = "pnpm-lock.yaml",
  yarn = "yarn.lock",
  bun = "bun.lockb"
}

test.group(`${app.name}@${app.version} CLI`, (group) => {
  group.setup(() => {
    ensureDirSync(rootDir);

    return () => emptyDirSync(rootDir);
  });

  test("should create a new app", async ({ assert }) => {
    const result = await app.run(["pnpm", "create", `${rootDir}/${projectName}`]);

    assert.equal(result, 0);

    const appDir = `${rootDir}/${projectName}`;
    const appDirTester = new PathTester(appDir);

    assert.isTrue(appDirTester.exists());
    assert.isTrue(appDirTester.isDir());

    for (const file of [...generatedFiles, ...eslintFiles, ...prettierFiles]) {
      const path = `${appDir}/${file}`;
      const pathTester = new PathTester(path);
      assert.isTrue(pathTester.exists());
    }
  });
});
