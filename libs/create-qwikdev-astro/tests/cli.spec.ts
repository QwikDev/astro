import { test } from "@japa/runner";
import { TestContext } from "@japa/runner/core";
import { run } from "@qwikdev/create-astro";
import { getPackageManager } from "@qwikdev/create-astro/utils";
import { emptyDirSync, ensureDirSync } from "fs-extra";

process.env.NODE_ENV = "test";
process.env.CI = "1";

const integration = "@qwikdev/astro";
const root = "labs";
const project = "test-app";

const setup = () => {
  ensureDirSync(root);

  return () => emptyDirSync(root);
};

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

  /*
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
  */

  if (options.ci) {
    files.push(".github/workflows/ci.yml");
  }

  return files;
};

const getGeneratedDirs = (options: GeneratedOptions = {}): string[] => {
  const dirs = generatedDirs;

  /*
  if (options.install) {
    dirs.push("node_modules");
  }
  */

  if (options.ci) {
    dirs.push(...[".github", ".github/workflows"]);
  }

  if (options.git) {
    dirs.push(".git");
  }

  return dirs;
};

test.group(`create ${integration} app`, (group) => {
  group.each.setup(setup);

  test("without adapter", async (context) => {
    return testRun([], context);
  });

  test("without adpater and using Biome", async (context) => {
    return testRun(["--biome"], context, {
      biome: true
    });
  });

  test("with Node.js adapter", async (context) => {
    return testRun(["node"], context);
  });

  test("with Node.js adapter and using Biome", async (context) => {
    return testRun(["node", "--biome"], context, {
      biome: true
    });
  });

  test("with Deno adapter", async (context) => {
    return testRun(["deno"], context);
  });

  test("with Deno adapter and using Biome", async (context) => {
    return testRun(["deno", "--biome"], context, {
      biome: true
    });
  });
});

test.group(`create ${integration} with yes and no options`, (group) => {
  group.setup(setup);

  test(`--no option`, async (context) => {
    return testRun(["--no"], context);
  });

  test(`--yes option`, async (context) => {
    return testRun(["--yes"], context, {
      biome: true,
      // install: true,
      ci: true,
      git: true
    });
  }).disableTimeout();
});

async function testRun(
  args: string[],
  context: TestContext,
  options: GeneratedOptions = {}
): Promise<void> {
  const { assert } = context;
  const destination = `${root}/${project}`;

  const result = await run(["pnpm", "create", `${destination}`, ...args]);
  assert.equal(result, 0);

  testProject(destination, context, options);
}

function testProject(
  project: string,
  context: TestContext,
  options: GeneratedOptions = {}
): void {
  const { assert, path } = context;
  const testProject = path(project);

  assert.isTrue(testProject.exists());
  assert.isTrue(testProject.isDir());

  testProjectDirs(project, context, options);
  testProjectFiles(project, context, options);
}

function testProjectDirs(
  project: string,
  { assert, path }: TestContext,
  options: GeneratedOptions = {}
): void {
  for (const dir of getGeneratedDirs(options)) {
    const testDir = path(`${project}/${dir}`);
    assert.isTrue(testDir.exists());
    assert.isTrue(testDir.isDir());
  }
}

function testProjectFiles(
  project: string,
  { assert, path }: TestContext,
  options: GeneratedOptions = {}
): void {
  for (const file of getGeneratedFiles(options)) {
    const testFile = path(`${project}/${file}`);
    assert.isTrue(testFile.exists());
    assert.isTrue(testFile.isFile());
  }
}
