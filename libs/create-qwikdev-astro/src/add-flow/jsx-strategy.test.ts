import assert from "node:assert/strict";
import { mkdtemp, rm, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { determineJsxStrategy } from "./jsx-strategy.js";
import { scaffoldQwikComponent } from "./scaffold.js";

// Test 1: determineJsxStrategy with "primary" returns correct strategy
{
  const strategy = determineJsxStrategy("primary");
  assert.deepStrictEqual(strategy, {
    qwikIsPrimary: true,
    pragma: null,
    tsconfigSource: "@qwik.dev/core"
  });
  console.log("PASS: determineJsxStrategy('primary') returns correct strategy");
}

// Test 2: determineJsxStrategy with "secondary" returns correct strategy
{
  const strategy = determineJsxStrategy("secondary");
  assert.deepStrictEqual(strategy, {
    qwikIsPrimary: false,
    pragma: "/** @jsxImportSource @qwik.dev/core */",
    tsconfigSource: null
  });
  console.log("PASS: determineJsxStrategy('secondary') returns correct strategy");
}

// Test 3: scaffoldQwikComponent with primary strategy writes Counter.tsx WITHOUT pragma
{
  const tmpDir = await mkdtemp(join(tmpdir(), "scaffold-primary-"));
  try {
    const strategy = determineJsxStrategy("primary");
    const outPath = await scaffoldQwikComponent(tmpDir, strategy);
    const content = await readFile(outPath, "utf-8");
    assert.ok(!content.startsWith("/** @jsxImportSource"), "primary should NOT have pragma");
    assert.ok(content.includes("@qwik.dev/core"), "should still import from @qwik.dev/core");
    console.log("PASS: scaffoldQwikComponent (primary) writes Counter.tsx WITHOUT pragma");
  } finally {
    await rm(tmpDir, { recursive: true });
  }
}

// Test 4: scaffoldQwikComponent with secondary strategy writes Counter.tsx WITH pragma as first line
{
  const tmpDir = await mkdtemp(join(tmpdir(), "scaffold-secondary-"));
  try {
    const strategy = determineJsxStrategy("secondary");
    const outPath = await scaffoldQwikComponent(tmpDir, strategy);
    const content = await readFile(outPath, "utf-8");
    assert.ok(
      content.startsWith("/** @jsxImportSource @qwik.dev/core */"),
      "secondary should have pragma as first line"
    );
    console.log("PASS: scaffoldQwikComponent (secondary) writes Counter.tsx WITH pragma as first line");
  } finally {
    await rm(tmpDir, { recursive: true });
  }
}

// Test 5: scaffoldQwikComponent creates src/components/qwik/ directory if it doesn't exist
{
  const tmpDir = await mkdtemp(join(tmpdir(), "scaffold-dir-"));
  try {
    const strategy = determineJsxStrategy("primary");
    const outPath = await scaffoldQwikComponent(tmpDir, strategy);
    // Verify the path includes the expected directory structure
    assert.ok(outPath.includes("src/components/qwik"), "output path should be under src/components/qwik");
    // Verify file was written (readFile would throw if it didn't exist)
    await readFile(outPath, "utf-8");
    console.log("PASS: scaffoldQwikComponent creates src/components/qwik/ directory if it doesn't exist");
  } finally {
    await rm(tmpDir, { recursive: true });
  }
}

console.log("\nAll 5 tests passed!");
