/**
 * Tests for rewriteConfig and generateWarning
 *
 * Run with: npx tsx src/add-flow/rewrite-config.test.ts
 */
import { rewriteConfig, generateWarning } from "./rewrite-config.js";
import type { MultiFrameworkResult } from "./types.js";

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

// -----------------------------------------------------------------------
// Test 1: react() with no args → add include as first argument
// -----------------------------------------------------------------------
console.log("\nTest 1: react() call gets include added as first argument");
{
  const source = `import react from '@astrojs/react';
export default {
  integrations: [react()]
};`;

  // Span of `react()` = let's calculate manually:
  // "import react from '@astrojs/react';\nexport default {\n  integrations: [" = 63 chars
  // "react()" starts at index 63, ends at 70
  const reactCallStart = source.indexOf("react()");
  const reactCallEnd = reactCallStart + "react()".length;

  const result: MultiFrameworkResult = {
    outcome: "safe",
    frameworks: [
      {
        name: "react",
        packageName: "@astrojs/react",
        hasInclude: false,
        hasExclude: false,
        integrationCallSpan: { start: reactCallStart, end: reactCallEnd }
      }
    ],
    notes: [],
    edits: [
      {
        type: "add-include",
        framework: "react",
        span: { start: reactCallStart, end: reactCallEnd },
        value: `['src/components/react/**/*']`
      }
    ]
  };

  const output = rewriteConfig(source, result);
  assert(output !== null, "returns non-null for safe outcome");
  assert(
    output!.includes(`react({ include: ['src/components/react/**/*'] })`),
    "include property added inside react call"
  );
  // Verify non-edit regions are unchanged
  const nonEditPrefix = source.slice(0, reactCallStart);
  assert(output!.startsWith(nonEditPrefix), "prefix before react() unchanged");
}

// -----------------------------------------------------------------------
// Test 2: react({ ssr: true }) → add include, existing options preserved
// -----------------------------------------------------------------------
console.log("\nTest 2: react({ ssr: true }) gets include prepended, ssr preserved");
{
  const source = `import react from '@astrojs/react';
export default {
  integrations: [react({ ssr: true })]
};`;

  const callText = `react({ ssr: true })`;
  const reactCallStart = source.indexOf(callText);
  const reactCallEnd = reactCallStart + callText.length;

  const result: MultiFrameworkResult = {
    outcome: "safe",
    frameworks: [
      {
        name: "react",
        packageName: "@astrojs/react",
        hasInclude: false,
        hasExclude: false,
        integrationCallSpan: { start: reactCallStart, end: reactCallEnd }
      }
    ],
    notes: [],
    edits: [
      {
        type: "add-include",
        framework: "react",
        span: { start: reactCallStart, end: reactCallEnd },
        value: `['src/components/react/**/*']`
      }
    ]
  };

  const output = rewriteConfig(source, result);
  assert(output !== null, "returns non-null for safe outcome");
  assert(
    output!.includes(`react({ include: ['src/components/react/**/*'], ssr: true })`),
    "include added before existing ssr option"
  );
}

// -----------------------------------------------------------------------
// Test 3: Qwik integration gets exclude added
// -----------------------------------------------------------------------
console.log("\nTest 3: qwik() call gets exclude added as first argument");
{
  const source = `import qwik from '@qwikdev/astro';
export default {
  integrations: [qwik()]
};`;

  const callText = `qwik()`;
  const qwikCallStart = source.indexOf(callText);
  const qwikCallEnd = qwikCallStart + callText.length;

  const result: MultiFrameworkResult = {
    outcome: "safe",
    frameworks: [],
    notes: [],
    edits: [
      {
        type: "add-exclude",
        framework: "qwik",
        span: { start: qwikCallStart, end: qwikCallEnd },
        value: `['src/components/react/**/*']`
      }
    ]
  };

  const output = rewriteConfig(source, result);
  assert(output !== null, "returns non-null for safe outcome");
  assert(
    output!.includes(`qwik({ exclude: ['src/components/react/**/*'] })`),
    "exclude property added inside qwik call"
  );
}

// -----------------------------------------------------------------------
// Test 4: outcome "unsafe" → rewriteConfig returns null, generateWarning returns explanation
// -----------------------------------------------------------------------
console.log("\nTest 4: unsafe outcome returns null from rewriteConfig, warning from generateWarning");
{
  const source = `import react from '@astrojs/react';
const extras = [react()];
export default {
  integrations: [...extras]
};`;

  const result: MultiFrameworkResult = {
    outcome: "unsafe",
    frameworks: [],
    notes: [
      "The integrations array contains spread elements, which cannot be statically analyzed."
    ],
    edits: []
  };

  const rewritten = rewriteConfig(source, result);
  assertEqual(rewritten, null, "rewriteConfig returns null for unsafe outcome");

  const warning = generateWarning(result);
  assert(warning.length > 0, "generateWarning returns non-empty string for unsafe");
  assert(warning.includes("spread"), "warning mentions spread elements");
  assert(warning.includes("manually"), "warning mentions manual configuration");
}

// -----------------------------------------------------------------------
// Test 5: outcome "already-configured" → rewriteConfig returns null
// -----------------------------------------------------------------------
console.log("\nTest 5: already-configured outcome returns null");
{
  const source = `import react from '@astrojs/react';
export default {
  integrations: [react({ include: ['**/*.tsx'] })]
};`;

  const result: MultiFrameworkResult = {
    outcome: "already-configured",
    frameworks: [
      {
        name: "react",
        packageName: "@astrojs/react",
        hasInclude: true,
        hasExclude: false,
        integrationCallSpan: { start: 0, end: 10 }
      }
    ],
    notes: [],
    edits: []
  };

  const rewritten = rewriteConfig(source, result);
  assertEqual(rewritten, null, "rewriteConfig returns null for already-configured");

  const warning = generateWarning(result);
  assert(warning.includes("already"), "warning says already configured");
}

// -----------------------------------------------------------------------
// Test 6: outcome "none" → rewriteConfig returns null, generateWarning returns empty string
// -----------------------------------------------------------------------
console.log("\nTest 6: none outcome returns null and empty warning");
{
  const source = `export default {
  integrations: []
};`;

  const result: MultiFrameworkResult = {
    outcome: "none",
    frameworks: [],
    notes: [],
    edits: []
  };

  const rewritten = rewriteConfig(source, result);
  assertEqual(rewritten, null, "rewriteConfig returns null for none outcome");

  const warning = generateWarning(result);
  assertEqual(warning, "", "generateWarning returns empty string for none");
}

// -----------------------------------------------------------------------
// Test 7: Formatting preservation — tabs stay tabbed, 4-space stays 4-space
// -----------------------------------------------------------------------
console.log("\nTest 7: Formatting preservation — tabs and 4-space indent preserved");
{
  // Tab-indented config
  const tabSource = `import react from '@astrojs/react';
export default {
\tintegrations: [react()]
};`;

  const tabCallStart = tabSource.indexOf("react()");
  const tabCallEnd = tabCallStart + "react()".length;

  const tabResult: MultiFrameworkResult = {
    outcome: "safe",
    frameworks: [
      {
        name: "react",
        packageName: "@astrojs/react",
        hasInclude: false,
        hasExclude: false,
        integrationCallSpan: { start: tabCallStart, end: tabCallEnd }
      }
    ],
    notes: [],
    edits: [
      {
        type: "add-include",
        framework: "react",
        span: { start: tabCallStart, end: tabCallEnd },
        value: `['**/*.tsx']`
      }
    ]
  };

  const tabOutput = rewriteConfig(tabSource, tabResult);
  assert(tabOutput !== null, "tab-indented config returns non-null");
  // Verify the tab character is preserved outside the edit region
  assert(tabOutput!.includes("\t"), "tab character preserved in output");

  // 4-space-indented config
  const spaceSource = `import react from '@astrojs/react';
export default {
    integrations: [react()]
};`;

  const spaceCallStart = spaceSource.indexOf("react()");
  const spaceCallEnd = spaceCallStart + "react()".length;

  const spaceResult: MultiFrameworkResult = {
    outcome: "safe",
    frameworks: [
      {
        name: "react",
        packageName: "@astrojs/react",
        hasInclude: false,
        hasExclude: false,
        integrationCallSpan: { start: spaceCallStart, end: spaceCallEnd }
      }
    ],
    notes: [],
    edits: [
      {
        type: "add-include",
        framework: "react",
        span: { start: spaceCallStart, end: spaceCallEnd },
        value: `['**/*.tsx']`
      }
    ]
  };

  const spaceOutput = rewriteConfig(spaceSource, spaceResult);
  assert(spaceOutput !== null, "4-space-indented config returns non-null");
  // Verify 4-space indentation preserved outside edit region
  assert(spaceOutput!.includes("    integrations"), "4-space indentation preserved");
  // Verify the edit was applied
  assert(spaceOutput!.includes("include:"), "include property added");
}

// -----------------------------------------------------------------------
// Summary
// -----------------------------------------------------------------------
console.log(`\nResults: ${passed} passed, ${failed} failed`);
if (failed > 0) {
  process.exit(1);
}
