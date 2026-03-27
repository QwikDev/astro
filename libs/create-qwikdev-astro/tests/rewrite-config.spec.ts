import { test } from "@japa/runner";
import { generateWarning, rewriteConfig } from "../src/add-flow/rewrite-config.js";
import type { MultiFrameworkResult } from "../src/add-flow/types.js";

test.group("rewriteConfig", () => {
  test("react() with no args gets include added", ({ assert }) => {
    const source = `import react from '@astrojs/react';
export default {
  integrations: [react()]
};`;

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
    assert.isNotNull(output);
    assert.include(output!, `react({ include: ['src/components/react/**/*'] })`);
    const nonEditPrefix = source.slice(0, reactCallStart);
    assert.isTrue(output!.startsWith(nonEditPrefix));
  });

  test("react({ ssr: true }) gets include prepended, ssr preserved", ({ assert }) => {
    const source = `import react from '@astrojs/react';
export default {
  integrations: [react({ ssr: true })]
};`;

    const callText = "react({ ssr: true })";
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
    assert.isNotNull(output);
    assert.include(output!, `react({ include: ['src/components/react/**/*'], ssr: true })`);
  });

  test("qwik() call gets exclude added", ({ assert }) => {
    const source = `import qwik from '@qwikdev/astro';
export default {
  integrations: [qwik()]
};`;

    const callText = "qwik()";
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
    assert.isNotNull(output);
    assert.include(output!, `qwik({ exclude: ['src/components/react/**/*'] })`);
  });

  test("unsafe outcome returns null", ({ assert }) => {
    const result: MultiFrameworkResult = {
      outcome: "unsafe",
      frameworks: [],
      notes: [
        "The integrations array contains spread elements, which cannot be statically analyzed."
      ],
      edits: []
    };

    const source = `import react from '@astrojs/react';
const extras = [react()];
export default {
  integrations: [...extras]
};`;

    const rewritten = rewriteConfig(source, result);
    assert.isNull(rewritten);
  });

  test("already-configured outcome returns null", ({ assert }) => {
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

    const source = `import react from '@astrojs/react';
export default {
  integrations: [react({ include: ['**/*.tsx'] })]
};`;

    const rewritten = rewriteConfig(source, result);
    assert.isNull(rewritten);
  });

  test("none outcome returns null", ({ assert }) => {
    const result: MultiFrameworkResult = {
      outcome: "none",
      frameworks: [],
      notes: [],
      edits: []
    };

    const source = `export default {
  integrations: []
};`;

    const rewritten = rewriteConfig(source, result);
    assert.isNull(rewritten);
  });

  test("tab indentation preserved", ({ assert }) => {
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
    assert.isNotNull(tabOutput);
    assert.include(tabOutput!, "\t");
  });

  test("4-space indentation preserved", ({ assert }) => {
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
    assert.isNotNull(spaceOutput);
    assert.include(spaceOutput!, "    integrations");
    assert.include(spaceOutput!, "include:");
  });
});

test.group("generateWarning", () => {
  test("unsafe outcome returns warning mentioning spread and manual config", ({ assert }) => {
    const result: MultiFrameworkResult = {
      outcome: "unsafe",
      frameworks: [],
      notes: [
        "The integrations array contains spread elements, which cannot be statically analyzed."
      ],
      edits: []
    };

    const warning = generateWarning(result);
    assert.isAbove(warning.length, 0);
    assert.include(warning, "spread");
    assert.include(warning, "manually");
  });

  test("already-configured outcome says already configured", ({ assert }) => {
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

    const warning = generateWarning(result);
    assert.include(warning, "already");
  });

  test("none outcome returns empty string", ({ assert }) => {
    const result: MultiFrameworkResult = {
      outcome: "none",
      frameworks: [],
      notes: [],
      edits: []
    };

    const warning = generateWarning(result);
    assert.equal(warning, "");
  });
});
