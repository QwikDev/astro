import { existsSync } from "node:fs";
import { readdir, rm } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { expect, test } from "@playwright/test";
import { build } from "astro";

const fixtureDir = fileURLToPath(
  new URL("../fixtures/node/", import.meta.url)
);
const distDir = join(fixtureDir, "dist");
const clientDir = join(distDir, "client");
const serverDir = join(distDir, "server");

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

test.describe("Node Adapter Build", () => {
  test.beforeAll(async () => {
    if (existsSync(distDir)) {
      await rm(distDir, { recursive: true });
    }
    await buildFixture();
  });

  test("creates client and server directories", () => {
    expect(existsSync(clientDir)).toBe(true);
    expect(existsSync(serverDir)).toBe(true);
  });

  test("client directory contains Qwik JS chunks", async () => {
    const files = await collectFiles(clientDir);
    const qwikChunks = files.filter(
      (f) => f.endsWith(".js") && f.includes("q-")
    );
    expect(qwikChunks.length).toBeGreaterThan(0);
  });

  test("client directory contains q-manifest.json", async () => {
    const files = await collectFiles(clientDir);
    const manifest = files.find((f) => f.endsWith("q-manifest.json"));
    expect(manifest).toBeDefined();
  });

  test("server directory contains SSR entry", async () => {
    const files = await collectFiles(serverDir);
    const serverEntry = files.find((f) => f.endsWith(".mjs") || f.endsWith(".js"));
    expect(serverEntry).toBeDefined();
  });
});
