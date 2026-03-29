import type { Assert } from "@japa/assert";
import { test } from "@japa/runner";
import { detectConfigFrameworks } from "../src/add-flow/detect-config.js";

declare module "@japa/runner/core" {
  interface TestContext {
    assert: Assert;
  }
}

test.group("detectConfigFrameworks", () => {
  test("single react integration detected", ({ assert }) => {
    const src = `import react from '@astrojs/react';
export default {
  integrations: [react()]
};`;

    const result = detectConfigFrameworks(src);
    assert.equal(result.outcome, "safe");
    assert.lengthOf(result.frameworks, 1);
    assert.equal(result.frameworks[0]?.name, "react");
    assert.equal(result.frameworks[0]?.packageName, "@astrojs/react");
    assert.isFalse(result.frameworks[0]?.hasInclude);
    assert.isFalse(result.frameworks[0]?.hasExclude);
  });

  test("preact and solid integrations both detected", ({ assert }) => {
    const src = `import preact from '@astrojs/preact';
import solid from '@astrojs/solid-js';
export default {
  integrations: [preact(), solid()]
};`;

    const result = detectConfigFrameworks(src);
    assert.equal(result.outcome, "safe");
    assert.lengthOf(result.frameworks, 2);
    const names = result.frameworks.map((f) => f.name).sort();
    assert.deepEqual(names, ["preact", "solid"]);
  });

  test("no recognized integrations returns outcome 'none'", ({ assert }) => {
    const src = `import vue from '@astrojs/vue';
export default {
  integrations: [vue()]
};`;

    const result = detectConfigFrameworks(src);
    assert.equal(result.outcome, "none");
    assert.lengthOf(result.frameworks, 0);
  });

  test("react with include option returns outcome 'already-configured'", ({ assert }) => {
    const src = `import react from '@astrojs/react';
export default {
  integrations: [react({ include: ['**/*.tsx'] })]
};`;

    const result = detectConfigFrameworks(src);
    assert.equal(result.outcome, "already-configured");
    assert.lengthOf(result.frameworks, 1);
    assert.isTrue(result.frameworks[0]?.hasInclude);
  });

  test("spread elements in integrations returns outcome 'unsafe'", ({ assert }) => {
    const src = `import react from '@astrojs/react';
const extras = [react()];
export default {
  integrations: [...extras]
};`;

    const result = detectConfigFrameworks(src);
    assert.equal(result.outcome, "unsafe");
    assert.isAbove(result.notes.length, 0);
  });

  test("bare react() returns safe with exclude edit for Qwik directory", ({ assert }) => {
    const src = `import react from '@astrojs/react';
export default {
  integrations: [react()]
};`;

    const result = detectConfigFrameworks(src);
    assert.equal(result.outcome, "safe");
    assert.lengthOf(result.edits, 1);
    assert.equal(result.edits[0]?.type, "add-exclude");
    assert.include(result.edits[0]?.value ?? "", "src/components/qwik");
  });

  test("multiple frameworks get exclude edits for Qwik directory", ({ assert }) => {
    const src = `import react from '@astrojs/react';
import solid from '@astrojs/solid-js';
export default {
  integrations: [react(), solid()]
};`;

    const result = detectConfigFrameworks(src);
    assert.equal(result.outcome, "safe");
    assert.lengthOf(result.edits, 2);
    assert.isTrue(result.edits.every((e) => e.type === "add-exclude"));
    assert.isTrue(result.edits.every((e) => e.value.includes("src/components/qwik")));
  });
});
