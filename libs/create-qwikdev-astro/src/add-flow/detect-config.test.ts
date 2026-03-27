/**
 * Tests for detectConfigFrameworks
 *
 * Run with: npx tsx src/add-flow/detect-config.test.ts
 */
import { detectConfigFrameworks } from "./detect-config.js";

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

function assertEqual<T>(actual: T, expected: T, message: string): void {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  if (ok) {
    console.log(`  PASS: ${message}`);
    passed++;
  } else {
    console.error(`  FAIL: ${message}`);
    console.error(`    Expected: ${JSON.stringify(expected)}`);
    console.error(`    Actual:   ${JSON.stringify(actual)}`);
    failed++;
  }
}

console.log("\nTest 1: Single react integration detected");
{
  const src = `
import react from '@astrojs/react';
export default {
  integrations: [react()]
};
`.trim();
  const result = detectConfigFrameworks(src);
  assertEqual(result.outcome, "safe", "outcome is safe");
  assert(result.frameworks.length === 1, "exactly one framework found");
  assert(result.frameworks[0]?.name === "react", "framework name is react");
  assert(result.frameworks[0]?.packageName === "@astrojs/react", "package name correct");
  assert(result.frameworks[0]?.hasInclude === false, "hasInclude is false");
  assert(result.frameworks[0]?.hasExclude === false, "hasExclude is false");
}

console.log("\nTest 2: Preact and Solid integrations both detected");
{
  const src = `
import preact from '@astrojs/preact';
import solid from '@astrojs/solid-js';
export default {
  integrations: [preact(), solid()]
};
`.trim();
  const result = detectConfigFrameworks(src);
  assertEqual(result.outcome, "safe", "outcome is safe");
  assert(result.frameworks.length === 2, "two frameworks found");
  const names = result.frameworks.map((f: { name: string }) => f.name).sort();
  assertEqual(names, ["preact", "solid"], "framework names are preact and solid");
}

console.log("\nTest 3: No recognized integrations returns outcome 'none'");
{
  const src = `
import vue from '@astrojs/vue';
export default {
  integrations: [vue()]
};
`.trim();
  const result = detectConfigFrameworks(src);
  assertEqual(result.outcome, "none", "outcome is none");
  assert(result.frameworks.length === 0, "no frameworks found");
}

console.log("\nTest 4: React with include option returns outcome 'already-configured'");
{
  const src = `
import react from '@astrojs/react';
export default {
  integrations: [react({ include: ['**/*.tsx'] })]
};
`.trim();
  const result = detectConfigFrameworks(src);
  assertEqual(result.outcome, "already-configured", "outcome is already-configured");
  assert(result.frameworks.length === 1, "one framework found");
  assert(result.frameworks[0]?.hasInclude === true, "hasInclude is true");
}

console.log("\nTest 5: Spread elements in integrations returns outcome 'unsafe'");
{
  const src = `
import react from '@astrojs/react';
const extras = [react()];
export default {
  integrations: [...extras]
};
`.trim();
  const result = detectConfigFrameworks(src);
  assertEqual(result.outcome, "unsafe", "outcome is unsafe");
  assert(result.notes.length > 0, "has explanatory note");
}

console.log(`\nResults: ${passed} passed, ${failed} failed`);
if (failed > 0) {
  process.exit(1);
}
