import { test } from "@japa/runner";
import { injectQwikIntegration } from "../src/add-flow/inject-qwik.js";

test.group("injectQwikIntegration", () => {
  test("defineConfig with empty integrations array", ({ assert }) => {
    const source = `import { defineConfig } from "astro/config";

// https://astro.build/config
export default defineConfig({
  integrations: [],
});`;

    const output = injectQwikIntegration(source);
    assert.isNotNull(output);
    assert.include(output!, `import qwik from "@qwik.dev/astro";`);
    assert.include(output!, "qwik()");
  });

  test("defineConfig with existing react integration", ({ assert }) => {
    const source = `import react from "@astrojs/react";
import { defineConfig } from "astro/config";

export default defineConfig({
  integrations: [react()],
});`;

    const output = injectQwikIntegration(source);
    assert.isNotNull(output);
    assert.include(output!, `import qwik from "@qwik.dev/astro";`);
    assert.include(output!, "qwik(), react()");
  });

  test("does not duplicate @qwik.dev/astro import", ({ assert }) => {
    const source = `import qwik from "@qwik.dev/astro";
import { defineConfig } from "astro/config";

export default defineConfig({
  integrations: [qwik()],
});`;

    const output = injectQwikIntegration(source);
    assert.isNotNull(output);
    const importCount = output!.split(`from "@qwik.dev/astro"`).length - 1;
    assert.equal(importCount, 1);
    const qwikCallCount = output!.split("qwik()").length - 1;
    assert.equal(qwikCallCount, 1);
  });

  test("does not duplicate import when old @qwikdev/astro exists", ({ assert }) => {
    const source = `import qwikDev from "@qwikdev/astro";
import { defineConfig } from "astro/config";

export default defineConfig({
  integrations: [qwikDev()],
});`;

    const output = injectQwikIntegration(source);
    assert.isNotNull(output);
    const newImportCount = output!.split(`from "@qwik.dev/astro"`).length - 1;
    assert.equal(newImportCount, 0);
  });

  test("adds integrations property when missing", ({ assert }) => {
    const source = `import { defineConfig } from "astro/config";

export default defineConfig({
  output: "server",
});`;

    const output = injectQwikIntegration(source);
    assert.isNotNull(output);
    assert.include(output!, `import qwik from "@qwik.dev/astro";`);
    assert.include(output!, "integrations: [qwik()]");
  });

  test("plain object export without defineConfig", ({ assert }) => {
    const source = `import { something } from "somewhere";

export default {
  integrations: [],
};`;

    const output = injectQwikIntegration(source);
    assert.isNotNull(output);
    assert.include(output!, `import qwik from "@qwik.dev/astro";`);
    assert.include(output!, "qwik()");
  });

  test("works with plain JS config (no TS syntax)", ({ assert }) => {
    const source = `import { defineConfig } from "astro/config";

// https://astro.build/config
export default defineConfig({
  integrations: [],
});`;

    const output = injectQwikIntegration(source);
    assert.isNotNull(output);
    assert.include(output!, `import qwik from "@qwik.dev/astro";`);
  });

  test("returns null when config is a variable reference", ({ assert }) => {
    const source = `import type { AstroUserConfig } from "astro";
import { defineConfig } from "astro/config";

const config: AstroUserConfig = {
  integrations: [],
};

export default defineConfig(config);`;

    const output = injectQwikIntegration(source);
    assert.isNull(output);
  });

  test("config with adapter and multiple integrations", ({ assert }) => {
    const source = `import react from "@astrojs/react";
import solid from "@astrojs/solid-js";
import { defineConfig } from "astro/config";
import node from "@astrojs/node";

export default defineConfig({
  output: "server",
  adapter: node({ mode: "standalone" }),
  integrations: [react(), solid()],
});`;

    const output = injectQwikIntegration(source);
    assert.isNotNull(output);
    assert.include(output!, `import qwik from "@qwik.dev/astro";`);
    assert.include(output!, "qwik(), react()");
  });

  test("no existing imports — import prepended at top", ({ assert }) => {
    const source = `export default {
  integrations: [],
};`;

    const output = injectQwikIntegration(source);
    assert.isNotNull(output);
    assert.isTrue(output!.startsWith(`import qwik from "@qwik.dev/astro";`));
  });
});
