import type { Assert } from "@japa/assert";
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "@japa/runner";
import type { TestContext } from "@japa/runner/core";
import pm from "panam";
import app from "../src/app.js";
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
const fixtureRoot = join("/tmp", "qwik-astro-add-unify-test");

// ── helpers ───────────────────────────────────────────────────────────

/**
 * React+Astro project that already has qwik() registered (so astro add is
 * skipped by the alreadyRegistered guard).  tsconfig uses JSONC format with
 * comments to exercise the comment-stripping fix in persistTsconfigForAdd.
 */
function writeReactAstroProjectJsoncTsconfig(dir: string) {
  rmSync(dir, { recursive: true, force: true });
  mkdirSync(dir, { recursive: true });

  // Qwik is already in the config so astro add is skipped (alreadyRegistered guard)
  writeFileSync(
    join(dir, "astro.config.mjs"),
    `import qwik from "@qwik.dev/astro";
import react from "@astrojs/react";
import { defineConfig } from "astro/config";

export default defineConfig({
  integrations: [react(), qwik()],
});
`
  );

  // JSONC tsconfig with // and /* */ comments — exercises persistTsconfigForAdd
  writeFileSync(
    join(dir, "tsconfig.json"),
    `// TypeScript configuration for Astro project
{
  /* compiler options */
  "compilerOptions": {
    "jsxImportSource": "react", // keep React as primary JSX source
    "strict": true
  }
}
`
  );

  writeFileSync(
    join(dir, "package.json"),
    JSON.stringify(
      {
        name: "react-astro-project",
        type: "module",
        dependencies: {
          astro: "^6.0.6",
          "@astrojs/react": "^4.0.0"
        }
      },
      null,
      2
    )
  );
}

/** Original helper: React+Astro project with qwik already configured. */
function writeReactAstroProject(dir: string) {
  rmSync(dir, { recursive: true, force: true });
  mkdirSync(dir, { recursive: true });

  writeFileSync(
    join(dir, "astro.config.mjs"),
    `import qwik from "@qwik.dev/astro";
import react from "@astrojs/react";
import { defineConfig } from "astro/config";

export default defineConfig({
  integrations: [react(), qwik()],
});
`
  );

  writeFileSync(
    join(dir, "tsconfig.json"),
    JSON.stringify(
      { compilerOptions: { jsxImportSource: "react" } },
      null,
      2
    )
  );

  writeFileSync(
    join(dir, "package.json"),
    JSON.stringify(
      {
        name: "react-astro-project",
        type: "module",
        dependencies: {
          astro: "^6.0.6",
          "@astrojs/react": "^4.0.0"
        }
      },
      null,
      2
    )
  );
}

function cleanup() {
  rmSync(fixtureRoot, { recursive: true, force: true });
}

// ── --add flow multi-framework detection ──────────────────────────────

test.group("--add flow multi-framework detection", (group) => {
  group.each.setup(() => cleanup);
  group.each.teardown(cleanup);

  test("JSONC tsconfig with comments does not crash --add flow", async ({ assert }) => {
    // Fixture: qwik already registered (astro add skipped), but tsconfig has JSONC comments.
    // Before fix: persistTsconfigForAdd silently returns on JSON.parse failure, leaving
    // tsconfig unchanged (still JSONC). After fix: stripJsonComments + parse + write works.
    writeReactAstroProjectJsoncTsconfig(fixtureRoot);

    // Intercept JSX strategy prompt — choose "primary" so persistTsconfigForAdd runs
    // (tsconfigSource is not null for primary strategy)
    app.intercept("Should Qwik be the primary JSX source?", "primary");

    const result = await run([pm.name, "create", fixtureRoot, "--add", "--no"]);

    assert.equal(result, 0);

    // After fix: tsconfig.json must be parseable as standard JSON (comments stripped,
    // jsxImportSource written). Before fix: the silent catch left the file as JSONC,
    // so JSON.parse throws here — this is the RED signal.
    const tsconfigRaw = readFileSync(join(fixtureRoot, "tsconfig.json"), "utf-8");
    assert.doesNotThrow(() => {
      JSON.parse(tsconfigRaw);
    }, "tsconfig.json must be valid JSON after --add flow (JSONC comments must be stripped before parsing)");

    // Primary strategy sets jsxImportSource to "@qwik.dev/core"
    const tsconfig = JSON.parse(tsconfigRaw);
    assert.equal(tsconfig.compilerOptions.jsxImportSource, "@qwik.dev/core");
  }).disableTimeout();

  test("--add on React project detects framework and applies exclude", async ({
    assert
  }) => {
    writeReactAstroProject(fixtureRoot);

    // Intercept JSX strategy prompt to choose "secondary"
    app.intercept("Should Qwik be the primary JSX source?", "secondary");

    const result = await run([pm.name, "create", fixtureRoot, "--add", "--no"]);

    assert.equal(result, 0);

    // Config should contain exclude pattern (from rewriteConfig)
    const configAfter = readFileSync(join(fixtureRoot, "astro.config.mjs"), "utf-8");
    assert.include(configAfter, "exclude");
    // Config should still contain react (not removed, just extended with exclude)
    assert.include(configAfter, "react(");

    // tsconfig should still have jsxImportSource: "react" (not overwritten since secondary)
    const tsconfig = JSON.parse(readFileSync(join(fixtureRoot, "tsconfig.json"), "utf-8"));
    assert.equal(tsconfig.compilerOptions.jsxImportSource, "react");

    // Counter.tsx should be scaffolded
    const counterPath = join(fixtureRoot, "src", "components", "qwik", "Counter.tsx");
    assert.isTrue(existsSync(counterPath), "Counter.tsx should exist");

    // Counter.tsx should contain the pragma (since secondary)
    const counterContent = readFileSync(counterPath, "utf-8");
    assert.include(counterContent, "/** @jsxImportSource @qwik.dev/core */");
  }).disableTimeout();
});
