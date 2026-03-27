import { test } from "@japa/runner";
import { readFile, rm, mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { determineJsxStrategy } from "../src/add-flow/jsx-strategy.js";
import { scaffoldQwikComponent } from "../src/add-flow/scaffold.js";

test.group("determineJsxStrategy", () => {
  test("primary returns correct strategy", ({ assert }) => {
    const strategy = determineJsxStrategy("primary");
    assert.deepEqual(strategy, {
      qwikIsPrimary: true,
      pragma: null,
      tsconfigSource: "@qwik.dev/core"
    });
  });

  test("secondary returns correct strategy", ({ assert }) => {
    const strategy = determineJsxStrategy("secondary");
    assert.deepEqual(strategy, {
      qwikIsPrimary: false,
      pragma: "/** @jsxImportSource @qwik.dev/core */",
      tsconfigSource: null
    });
  });
});

test.group("scaffoldQwikComponent", () => {
  test("primary strategy writes Counter.tsx WITHOUT pragma", async ({ assert }) => {
    const tmpDir = await mkdtemp(join(tmpdir(), "scaffold-primary-"));
    try {
      const strategy = determineJsxStrategy("primary");
      const outPath = await scaffoldQwikComponent(tmpDir, strategy);
      const content = await readFile(outPath, "utf-8");
      assert.isFalse(content.startsWith("/** @jsxImportSource"));
      assert.include(content, "@qwik.dev/core");
    } finally {
      await rm(tmpDir, { recursive: true });
    }
  });

  test("secondary strategy writes Counter.tsx WITH pragma as first line", async ({ assert }) => {
    const tmpDir = await mkdtemp(join(tmpdir(), "scaffold-secondary-"));
    try {
      const strategy = determineJsxStrategy("secondary");
      const outPath = await scaffoldQwikComponent(tmpDir, strategy);
      const content = await readFile(outPath, "utf-8");
      assert.isTrue(content.startsWith("/** @jsxImportSource @qwik.dev/core */"));
    } finally {
      await rm(tmpDir, { recursive: true });
    }
  });

  test("creates src/components/qwik/ directory", async ({ assert }) => {
    const tmpDir = await mkdtemp(join(tmpdir(), "scaffold-dir-"));
    try {
      const strategy = determineJsxStrategy("primary");
      const outPath = await scaffoldQwikComponent(tmpDir, strategy);
      assert.include(outPath, "src/components/qwik");
      await readFile(outPath, "utf-8");
    } finally {
      await rm(tmpDir, { recursive: true });
    }
  });
});
