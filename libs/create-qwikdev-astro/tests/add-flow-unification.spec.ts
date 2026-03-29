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

/** Non-empty directory with leftover files but NO package.json — triggers crash in interact() line 322.
 * Reproduces: a previous failed `pnpm dlx ... --add` leaves qwik-astro-app/ with only src/,
 * then a retry hits `getPackageJson(outDir)` → ENOENT because notEmptyDir is true but package.json is missing. */
function writeDirWithoutPackageJson(dir: string) {
  rmSync(dir, { recursive: true, force: true });
  mkdirSync(join(dir, "src"), { recursive: true });
  writeFileSync(join(dir, "src", "placeholder.txt"), "leftover from failed run");
}

/**
 * React+Astro project WITHOUT qwik registered.  Used by the e2e test so the
 * full `astro add @qwik.dev/astro` path actually runs (not short-circuited by
 * the alreadyRegistered guard).
 */
function writeReactAstroProjectNoQwik(dir: string) {
  rmSync(dir, { recursive: true, force: true });
  mkdirSync(dir, { recursive: true });

  writeFileSync(
    join(dir, "astro.config.mjs"),
    `import react from "@astrojs/react";\nimport { defineConfig } from "astro/config";\n\nexport default defineConfig({\n  integrations: [react()],\n});\n`
  );

  writeFileSync(
    join(dir, "tsconfig.json"),
    JSON.stringify({ compilerOptions: { jsxImportSource: "react" } }, null, 2)
  );

  writeFileSync(
    join(dir, "package.json"),
    JSON.stringify(
      {
        name: "react-only-add-test",
        type: "module",
        dependencies: {
          astro: "^6.0.6",
          "@astrojs/react": "^4.0.0",
          react: "^19.0.0",
          "react-dom": "^19.0.0"
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

  test("--add on non-empty dir without package.json does not crash in interact", async ({
    assert
  }) => {
    writeDirWithoutPackageJson(fixtureRoot);

    // interact() is only reached when isIt() returns true (non-CI, non-test).
    // Temporarily unset CI/NODE_ENV so the interactive path is exercised,
    // which hits getPackageJson(outDir) on line 322 when notEmptyDir is true.
    // Before fix: throws "File package.json not found" (ENOENT).
    // After fix: falls back to sanitized directory name.
    const origCI = process.env.CI;
    const origNodeEnv = process.env.NODE_ENV;
    delete process.env.CI;
    delete process.env.NODE_ENV;

    try {
      // Intercept all prompts that interact() would ask
      app.intercept("Where would you like to create your new project?", fixtureRoot);
      app.intercept("Do you want to add @qwik.dev/astro to your existing project?", true);
      app.intercept("Copy template files safely (without overwriting existing files)?", true);
      app.intercept("Would you like to install pnpm dependencies?", false);
      app.intercept("Would you like to save the changes with Git?", false);
      app.intercept("Would you like to add CI workflow?", false);

      // Call interact() directly — run() would continue to execute() which calls
      // process.exit via panic(), killing the test runner.
      // parse() expects hideBin'd args (positional + flags only).
      const definition = app.parse([fixtureRoot, "--add"]);
      const input = await app.interact(definition);

      // interact() must not throw. packageName should fall back to sanitized dir name.
      assert.isString(input.packageName);
      assert.isTrue(input.packageName.length > 0, "packageName should not be empty");
    } finally {
      process.env.CI = origCI;
      process.env.NODE_ENV = origNodeEnv;
    }
  }).disableTimeout();

  test("--add with no destination defaults to current directory, not ./qwik-astro-app", async ({
    assert
  }) => {
    // When --add is used without a positional destination arg, interact() should
    // default to "./" (current project), not "./qwik-astro-app" (new subdirectory).
    //
    // Reproduces: user runs `pnpm dlx ... --add`, hits Enter on the prompt default,
    // and ends up targeting a nonexistent subdirectory instead of the current project.
    //
    // In non-interactive mode (CI=1), scanString returns its initialValue directly
    // without prompting. So calling interact() in CI mode lets us observe what
    // default value would be shown to the user.

    // Clear any leftover intercepts from previous tests
    app.interactions.clear();

    const definition = app.parse(["--add"]);
    const input = await app.interact(definition);

    // BUG: outDir ends with /qwik-astro-app because interact() passes the
    // default "./qwik-astro-app" as initialValue even when --add is set.
    // EXPECTED: outDir should be cwd (the default should be "./" for --add).
    assert.isFalse(
      input.outDir.endsWith("qwik-astro-app"),
      `--add default should resolve to cwd, not ./qwik-astro-app. Got: ${input.outDir}`
    );
  }).disableTimeout();

  test("--add --yes (non-interactive) defaults to current directory, not ./qwik-astro-app", async ({
    assert
  }) => {
    // validate() is the non-interactive path (CI, --yes, --no).
    // When --add is set, destination should resolve to "./" not "./qwik-astro-app".
    const definition = app.parse(["--add", "--yes"]);
    const input = app.validate(definition);

    assert.isFalse(
      input.outDir.endsWith("qwik-astro-app"),
      `--add --yes should resolve to cwd, not ./qwik-astro-app. Got: ${input.outDir}`
    );
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

// ── --add e2e with real install ────────────────────────────────────────

test.group("--add e2e with real install (React project)", (group) => {
  group.each.setup(() => cleanup);
  group.each.teardown(cleanup);

  test("--add on React project with install enabled adds qwik and preserves react", async ({
    assert
  }) => {
    writeReactAstroProjectNoQwik(fixtureRoot);

    // Real install so astro add @qwik.dev/astro can run
    await pm.install({ cwd: fixtureRoot });

    // Intercept JSX strategy prompt — choose "secondary" (React stays primary)
    app.intercept("Should Qwik be the primary JSX source?", "secondary");

    const result = await run([pm.name, "create", fixtureRoot, "--add", "--yes"]);

    assert.equal(result, 0, "Expected --add flow to exit 0");

    // Config should have qwik() added
    const configAfter = readFileSync(join(fixtureRoot, "astro.config.mjs"), "utf-8");
    assert.include(configAfter, "qwik", "Config should contain qwik integration");
    // React must be preserved
    assert.include(configAfter, "react(", "Config should still contain react integration");
    // Exclude pattern added for secondary strategy
    assert.include(configAfter, "exclude", "Config should contain exclude pattern for secondary strategy");

    // tsconfig should keep react as primary (secondary strategy)
    const tsconfig = JSON.parse(readFileSync(join(fixtureRoot, "tsconfig.json"), "utf-8"));
    assert.equal(tsconfig.compilerOptions.jsxImportSource, "react");

    // Counter.tsx should be scaffolded with pragma (secondary)
    const counterPath = join(fixtureRoot, "src", "components", "qwik", "Counter.tsx");
    assert.isTrue(existsSync(counterPath), "Counter.tsx should be scaffolded");
    const counterContent = readFileSync(counterPath, "utf-8");
    assert.include(counterContent, "/** @jsxImportSource @qwik.dev/core */");
  }).disableTimeout();
});
