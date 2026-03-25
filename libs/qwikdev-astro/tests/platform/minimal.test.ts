import { existsSync } from "node:fs";
import { readFile, readdir, rm } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { expect, test } from "@playwright/test";
import { build } from "astro";

const fixtureDir = fileURLToPath(new URL("../fixtures/minimal/", import.meta.url));
const distDir = join(fixtureDir, "dist");

test.describe("Static Build Output", () => {
  test.beforeAll(async () => {
    if (existsSync(distDir)) {
      await rm(distDir, { recursive: true });
    }

    const prevCwd = process.cwd();
    process.chdir(fixtureDir);
    try {
      await build({});
    } finally {
      process.chdir(prevCwd);
    }
  });

  test("dist directory is created", () => {
    expect(existsSync(distDir)).toBe(true);
  });

  test("build output contains Qwik JS chunks", async () => {
    const files = await collectFiles(distDir);
    const qwikChunks = files.filter((f) => f.endsWith(".js") && f.includes("q-"));
    expect(qwikChunks.length).toBeGreaterThan(0);
  });

  test("build output contains q-manifest.json", () => {
    expect(existsSync(join(distDir, "q-manifest.json"))).toBe(true);
  });

  test("build output contains rendered HTML with q:container", async () => {
    const files = await collectFiles(distDir);
    const indexHtml = files.find((f) => f.endsWith("index.html"));
    expect(indexHtml).toBeDefined();

    const content = await readFile(indexHtml!, "utf-8");
    expect(content).toContain("q:container");
  });

  test("rendered HTML contains the counter component markup", async () => {
    const files = await collectFiles(distDir);
    const indexHtml = files.find((f) => f.endsWith("index.html"))!;
    const content = await readFile(indexHtml, "utf-8");
    expect(content).toContain('data-testid="counter"');
  });
});

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
