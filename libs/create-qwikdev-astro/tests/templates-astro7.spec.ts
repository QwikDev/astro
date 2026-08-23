import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { test } from "@japa/runner";

const templatesDir = fileURLToPath(new URL("../stubs/templates/", import.meta.url));
const templateNames = ["none", "none-biome", "node", "node-biome", "deno", "deno-biome"];

function readPackageJson(templateName: string) {
  return JSON.parse(
    readFileSync(join(templatesDir, templateName, "package.json"), "utf-8")
  );
}

test.group("Astro 7 templates", () => {
  for (const templateName of templateNames) {
    test(`${templateName} uses the v1 Astro 7 integration`, ({ assert }) => {
      const pkg = readPackageJson(templateName);

      assert.equal(pkg.dependencies.astro, "^7.2.4");
      assert.equal(pkg.dependencies["@qwik.dev/astro"], "^1.1.0");
      assert.isUndefined(pkg.overrides);
      assert.isUndefined(pkg.pnpm);
    });
  }

  for (const templateName of ["node", "node-biome"]) {
    test(`${templateName} serves the Astro adapter entry`, ({ assert }) => {
      const pkg = readPackageJson(templateName);

      assert.include(pkg.scripts.serve, "dist/server/index.mjs");
      assert.equal(pkg.engines.node, ">=22.12.0");
    });
  }

  for (const templateName of ["deno", "deno-biome"]) {
    test(`${templateName} serves and deploys the Astro adapter entry`, ({ assert }) => {
      const pkg = readPackageJson(templateName);

      assert.include(pkg.scripts.serve, "dist/server/index.mjs");
      assert.include(pkg.scripts.deploy, "dist/server/index.mjs");
    });
  }
});
