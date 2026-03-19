import { existsSync } from "node:fs";
import { readdir, readFile, rm } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { expect, test } from "@playwright/test";
import { build, preview } from "astro";
import type { PreviewServer } from "astro";

const fixtureDir = fileURLToPath(
  new URL("../fixtures/minimal/", import.meta.url)
);
const distDir = join(fixtureDir, "dist");

async function buildFixture() {
  const prevCwd = process.cwd();
  process.chdir(fixtureDir);
  try {
    await build({});
  } finally {
    process.chdir(prevCwd);
  }
}

test.describe("Build Output", () => {
  test.beforeAll(async () => {
    if (existsSync(distDir)) {
      await rm(distDir, { recursive: true });
    }
    await buildFixture();
  });

  test("dist directory is created", () => {
    expect(existsSync(distDir)).toBe(true);
  });

  test("build output contains Qwik JS chunks", async () => {
    const files = await collectFiles(distDir);
    const qwikChunks = files.filter(
      (f) => f.endsWith(".js") && f.includes("q-")
    );
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

test.describe("Production Preview", () => {
  let previewServer: PreviewServer;

  test.beforeAll(async () => {
    if (!existsSync(join(distDir, "index.html"))) {
      await buildFixture();
    }

    const prevCwd = process.cwd();
    process.chdir(fixtureDir);
    previewServer = await preview({});
    process.chdir(prevCwd);
  });

  test.afterAll(async () => {
    await previewServer?.stop();
  });

  test("Qwik container is SSR rendered in production", async ({ page }) => {
    const url = `http://localhost:${previewServer.port}/`;
    const response = await page.goto(url);

    expect(response?.ok()).toBe(true);
    await expect(page.locator("[q\\:container]").first()).toBeVisible();
  });

  test("Counter increments on click", async ({ page }) => {
    const url = `http://localhost:${previewServer.port}/`;
    await page.goto(url);

    const counter = page.getByTestId("counter");
    await expect(counter).toBeVisible();
    await expect(counter).toHaveText("0");
    await counter.click();
    await expect(counter).toHaveText("1");
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
