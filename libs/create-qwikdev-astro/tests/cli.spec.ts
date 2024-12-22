import { test } from "@japa/runner";
import app from "@qwikdev/create-astro/app";
import { getPackageManager } from "@qwikdev/create-astro/utils";
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

type GeneratedOptions = {
  biome: boolean;
  install: boolean;
  ci: boolean;
  git: boolean;
};

const getGeneratedFiles = (options: Partial<GeneratedOptions> = {}): string[] => {
  let files = [
    ...generatedFiles,
    ...(options.biome
      ? ["biome.json"]
      : [".eslintignore", ".eslintrc.cjs", ".prettierignore", "prettier.config.cjs"])
  ];

  if (options.install) {
    const lockFile = {
      npm: "package-lock.json",
      pnpm: "pnpm-lock.yaml",
      yarn: "yarn.lock",
      bun: "bun.lockb"
    };
    const pm = getPackageManager();

    files.push(pm in lockFile ? lockFile[pm] : lockFile.npm);
  }

  if (options.ci) {
    files.push(".github/workflows/ci.yml");
  }

  return files;
};

test.group(`${app.name}@${app.version} CLI`, (group) => {
  group.setup(() => {
    ensureDirSync(rootDir);

    return () => emptyDirSync(rootDir);
  });

  test("should create a new app", async ({ assert, path }) => {
    const result = await app.run(["pnpm", "create", `${rootDir}/${projectName}`]);

    assert.equal(result, 0);

    const dir = `${rootDir}/${projectName}`;
    const testDir = path(dir);

    assert.isTrue(testDir.exists());
    assert.isTrue(testDir.isDir());

    for (const file of getGeneratedFiles()) {
      const testFile = path(`${dir}/${file}`);
      assert.isTrue(testFile.exists());
    }
  });
});
