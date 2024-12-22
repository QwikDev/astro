import { test } from "@japa/runner";
import { run } from "@qwikdev/create-astro";
import { getPackageManager } from "@qwikdev/create-astro/utils";
import { emptyDirSync, ensureDirSync } from "fs-extra";

const integration = "@qwikdev/astro";
const root = "tests/apps";
const project = "test-app";

const generatedDirs = [
  ".vscode",
  "public",
  "src",
  "src/assets",
  "src/components",
  "src/layouts",
  "src/pages",
  "src/styles"
];

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

type GeneratedOptions = Partial<{
  biome: boolean;
  install: boolean;
  ci: boolean;
  git: boolean;
}>;

const getGeneratedFiles = (options: GeneratedOptions = {}): string[] => {
  const files = [
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

const getGeneratedDirs = (options: GeneratedOptions = {}): string[] => {
  const dirs = generatedDirs;

  if (options.install) {
    dirs.push("node_modules");
  }

  if (options.ci) {
    dirs.push(...[".github", ".github/workflows"]);
  }

  if (options.git) {
    dirs.push(".git");
  }

  return dirs;
};

test.group(`pnpm create ${integration}`, (group) => {
  group.setup(() => {
    ensureDirSync(root);

    return () => emptyDirSync(root);
  });

  test(`should create a new ${integration} app`, async ({ assert, path }) => {
    const result = await run(["pnpm", "create", `${root}/${project}`]);

    assert.equal(result, 0);

    const projectDir = `${root}/${project}`;
    const testProjectDir = path(projectDir);

    assert.isTrue(testProjectDir.exists());
    assert.isTrue(testProjectDir.isDir());

    for (const dir of getGeneratedDirs()) {
      const testDir = path(`${projectDir}/${dir}`);
      assert.isTrue(testDir.exists());
      assert.isTrue(testDir.isDir());
    }

    for (const file of getGeneratedFiles()) {
      const testFile = path(`${projectDir}/${file}`);
      assert.isTrue(testFile.exists());
      assert.isTrue(testFile.isFile());
    }
  });
});
