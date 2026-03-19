import { existsSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { expect, test } from "@playwright/test";
import { build, preview } from "astro";
import type { PreviewServer } from "astro";

const fixtureDir = fileURLToPath(
  new URL("../fixtures/minimal/", import.meta.url)
);
const distDir = join(fixtureDir, "dist");

test.describe("Production Preview", () => {
  let previewServer: PreviewServer;

  test.beforeAll(async () => {
    const prevCwd = process.cwd();
    process.chdir(fixtureDir);

    if (!existsSync(join(distDir, "index.html"))) {
      await build({});
    }

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
