/**
 * Tests for detectSourceFrameworks
 *
 * Run with: npx tsx src/add-flow/detect-source.test.ts
 */
import { mkdtemp, mkdir, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { detectSourceFrameworks } from "./detect-source.js";

let passed = 0;
let failed = 0;

function assert(condition: boolean, message: string): void {
  if (condition) {
    console.log(`  PASS: ${message}`);
    passed++;
  } else {
    console.error(`  FAIL: ${message}`);
    failed++;
  }
}

async function withTempDir(fn: (dir: string) => Promise<void>): Promise<void> {
  const dir = await mkdtemp(join(tmpdir(), "detect-source-test-"));
  try {
    await fn(dir);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

console.log("\nTest 1: File with react import returns react signal");
await withTempDir(async (dir) => {
  await mkdir(join(dir, "src"));
  await writeFile(
    join(dir, "src/App.tsx"),
    `import React from 'react';\nexport default function App() { return <div />; }`
  );
  const signals = await detectSourceFrameworks(dir);
  const reactSignals = signals.filter((s) => s.framework === "react");
  assert(reactSignals.length > 0, "found react signal");
  assert(reactSignals[0]?.signal === "import", "signal type is import");
});

console.log("\nTest 2: File with @jsxImportSource pragma returns pragma signal");
await withTempDir(async (dir) => {
  await mkdir(join(dir, "src"));
  await writeFile(
    join(dir, "src/Widget.jsx"),
    `/** @jsxImportSource react */\nexport default function Widget() { return <span />; }`
  );
  const signals = await detectSourceFrameworks(dir);
  const reactSignals = signals.filter((s) => s.framework === "react");
  assert(reactSignals.length > 0, "found react signal");
  assert(reactSignals[0]?.signal === "pragma", "signal type is pragma");
});

console.log("\nTest 3: JSX/TSX file with useState import returns react signal");
await withTempDir(async (dir) => {
  await mkdir(join(dir, "src"));
  await writeFile(
    join(dir, "src/Counter.tsx"),
    `import { useState } from 'react';\nexport default function Counter() { const [n, setN] = useState(0); return n; }`
  );
  const signals = await detectSourceFrameworks(dir);
  const reactSignals = signals.filter((s) => s.framework === "react");
  assert(reactSignals.length > 0, "found react signal for useState import");
});

console.log("\nTest 4: Directory with no framework signals returns empty array");
await withTempDir(async (dir) => {
  await mkdir(join(dir, "src"));
  await writeFile(
    join(dir, "src/plain.ts"),
    `export const greeting = "hello world";`
  );
  const signals = await detectSourceFrameworks(dir);
  assert(signals.length === 0, "no signals returned for plain file");
});

console.log("\nTest 5: Files in node_modules are excluded from scanning");
await withTempDir(async (dir) => {
  // No src/ directory needed — just node_modules with react imports
  await mkdir(join(dir, "node_modules", "react"), { recursive: true });
  await writeFile(
    join(dir, "node_modules", "react", "index.js"),
    `import React from 'react';\nexport default React;`
  );
  const signals = await detectSourceFrameworks(dir);
  assert(signals.length === 0, "node_modules files are excluded");
});

console.log(`\nResults: ${passed} passed, ${failed} failed`);
if (failed > 0) {
  process.exit(1);
}
