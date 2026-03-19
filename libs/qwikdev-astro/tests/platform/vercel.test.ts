import { existsSync } from "node:fs";
import { readdir, rm } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { expect, test } from "@playwright/test";
import { build } from "astro";

const fixtureDir = fileURLToPath(
  new URL("../fixtures/vercel/", import.meta.url)
);
const distDir = join(fixtureDir, "dist");
const vercelDir = join(fixtureDir, ".vercel", "output");
const staticDir = join(vercelDir, "static");
const functionsDir = join(vercelDir, "functions");

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

test.describe("Vercel Adapter Build", () => {
  test.beforeAll(async () => {
    if (existsSync(distDir)) {
      await rm(distDir, { recursive: true });
    }
    if (existsSync(join(fixtureDir, ".vercel"))) {
      await rm(join(fixtureDir, ".vercel"), { recursive: true });
    }
    await buildFixture();
  });

  test("creates .vercel/output directory", () => {
    expect(existsSync(vercelDir)).toBe(true);
  });

  test("static directory contains Qwik JS chunks", async () => {
    expect(existsSync(staticDir)).toBe(true);
    const files = await collectFiles(staticDir);
    const qwikChunks = files.filter(
      (f) => f.endsWith(".js") && f.includes("q-")
    );
    expect(qwikChunks.length).toBeGreaterThan(0);
  });

  test("static directory contains q-manifest.json", async () => {
    const files = await collectFiles(staticDir);
    const manifest = files.find((f) => f.endsWith("q-manifest.json"));
    expect(manifest).toBeDefined();
  });

  test("functions directory contains serverless entry", () => {
    expect(existsSync(functionsDir)).toBe(true);
  });

  test("config.json is generated", () => {
    expect(existsSync(join(vercelDir, "config.json"))).toBe(true);
  });
});
