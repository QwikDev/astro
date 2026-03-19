import { existsSync } from "node:fs";
import { readdir, rm } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { expect, test } from "@playwright/test";
import { build } from "astro";

const fixtureDir = fileURLToPath(
  new URL("../fixtures/netlify/", import.meta.url)
);
const distDir = join(fixtureDir, "dist");
const netlifyDir = join(fixtureDir, ".netlify");

async function buildFixture() {
  const prevCwd = process.cwd();
  process.chdir(fixtureDir);
  try {
    await build({});
  } finally {
    process.chdir(prevCwd);
  }
}

async function collectFiles(dir: string): Promise<string[]> {
  const results: string[] = [];
  const entries = await readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...(await collectFiles(fullPath)));
    } else {
      results.push(fullPath);
    }
  }
  return results;
}

test.describe("Netlify Adapter Build", () => {
  test.beforeAll(async () => {
    if (existsSync(distDir)) {
      await rm(distDir, { recursive: true });
    }
    if (existsSync(netlifyDir)) {
      await rm(netlifyDir, { recursive: true });
    }
    await buildFixture();
  });

  test("creates dist directory", () => {
    expect(existsSync(distDir)).toBe(true);
  });

  test("build output contains Qwik JS chunks", async () => {
    const allDirs = [distDir, netlifyDir].filter(existsSync);
    const files = (await Promise.all(allDirs.map(collectFiles))).flat();
    const qwikChunks = files.filter(
      (f) => f.endsWith(".js") && f.includes("q-")
    );
    expect(qwikChunks.length).toBeGreaterThan(0);
  });

  test("build output contains q-manifest.json", async () => {
    const allDirs = [distDir, netlifyDir].filter(existsSync);
    const files = (await Promise.all(allDirs.map(collectFiles))).flat();
    const manifest = files.find((f) => f.endsWith("q-manifest.json"));
    expect(manifest).toBeDefined();
  });

  test("creates .netlify directory with functions", () => {
    expect(existsSync(netlifyDir)).toBe(true);
  });
});
