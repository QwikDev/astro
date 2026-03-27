import type { Assert } from "@japa/assert";
import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "@japa/runner";
import type { TestContext } from "@japa/runner/core";
import pm from "panam";
import { hasQwikImport } from "../src/add-flow/detect-config.js";
import { run } from "../src/index.js";

declare module "@japa/runner/core" {
  interface TestContext {
    assert: Assert;
  }
}

process.env.NODE_ENV = "test";
process.env.CI = "1";
delete process.env.npm_config_user_agent;

// Use /tmp so the fixture is outside the qwik-astro workspace.
// Inside the workspace, @qwik.dev/astro resolves via hoisted node_modules
// and the original bug doesn't reproduce.
const fixtureRoot = join("/tmp", "qwik-astro-add-test");

// ── config fixtures ───────────────────────────────────────────────────

const INLINE_CONFIG = `import qwik from "@qwik.dev/astro";
import { defineConfig } from "astro/config";

export default defineConfig({
  integrations: [qwik()],
});
`;

const VARIABLE_CONFIG = `import qwik from "@qwik.dev/astro";
import { defineConfig } from "astro/config";

const config = defineConfig({
  integrations: [qwik()],
});

export default config;
`;

const CALLBACK_CONFIG = `import qwik from "@qwik.dev/astro";
import { defineConfig } from "astro/config";

export default defineConfig(() => ({
  integrations: [qwik()],
}));
`;

const STALE_IMPORT_CONFIG = `import qwik from "@qwik.dev/astro";
import { defineConfig } from "astro/config";

export default defineConfig({
  integrations: [],
});
`;

const CLEAN_CONFIG = `import { defineConfig } from "astro/config";

export default defineConfig({});
`;

// ── helpers ───────────────────────────────────────────────────────────

function writeExistingProject(configSource: string) {
  rmSync(fixtureRoot, { recursive: true, force: true });
  mkdirSync(fixtureRoot, { recursive: true });

  writeFileSync(join(fixtureRoot, "astro.config.ts"), configSource);
  writeFileSync(
    join(fixtureRoot, "package.json"),
    JSON.stringify(
      {
        name: "existing-astro-project",
        type: "module",
        dependencies: { astro: "^6.0.6" }
      },
      null,
      2
    )
  );
  writeFileSync(
    join(fixtureRoot, "tsconfig.json"),
    JSON.stringify({ compilerOptions: {} }, null, 2)
  );
}

function cleanup() {
  rmSync(fixtureRoot, { recursive: true, force: true });
}

// ── hasQwikImport unit tests ──────────────────────────────────────────

test.group("hasQwikImport", () => {
  test("true for default import", ({ assert }) => {
    assert.isTrue(hasQwikImport(INLINE_CONFIG));
  });

  test("true for variable-exported config", ({ assert }) => {
    assert.isTrue(hasQwikImport(VARIABLE_CONFIG));
  });

  test("true for callback-based defineConfig", ({ assert }) => {
    assert.isTrue(hasQwikImport(CALLBACK_CONFIG));
  });

  test("true for stale import without registration", ({ assert }) => {
    // The import exists, so we must pre-install to avoid the crash.
    // astro add will handle the rest of the setup.
    assert.isTrue(hasQwikImport(STALE_IMPORT_CONFIG));
  });

  test("false for clean config with no qwik", ({ assert }) => {
    assert.isFalse(hasQwikImport(CLEAN_CONFIG));
  });
});

// ── integration: --add flow ───────────────────────────────────────────

test.group("--add on existing project with @qwik.dev/astro already in config", (group) => {
  group.each.setup(() => cleanup);
  group.each.teardown(cleanup);

  test("inline config — pre-installs then succeeds", async ({ assert }) => {
    writeExistingProject(INLINE_CONFIG);

    const result = await run([pm.name, "create", fixtureRoot, "--add", "--no"]);

    assert.equal(result, 0);
    const pkg = JSON.parse(readFileSync(join(fixtureRoot, "package.json"), "utf-8"));
    assert.isDefined(pkg.dependencies["@qwik.dev/astro"]);
  }).disableTimeout();

  test("variable-exported config — pre-installs then succeeds", async ({ assert }) => {
    writeExistingProject(VARIABLE_CONFIG);

    const result = await run([pm.name, "create", fixtureRoot, "--add", "--no"]);

    assert.equal(result, 0);
    const pkg = JSON.parse(readFileSync(join(fixtureRoot, "package.json"), "utf-8"));
    assert.isDefined(pkg.dependencies["@qwik.dev/astro"]);
  }).disableTimeout();

  test("callback config — pre-installs then succeeds", async ({ assert }) => {
    writeExistingProject(CALLBACK_CONFIG);

    const result = await run([pm.name, "create", fixtureRoot, "--add", "--no"]);

    assert.equal(result, 0);
    const pkg = JSON.parse(readFileSync(join(fixtureRoot, "package.json"), "utf-8"));
    assert.isDefined(pkg.dependencies["@qwik.dev/astro"]);
  }).disableTimeout();
});
