import { loadFixture } from "@inox-tools/astro-tests/astroFixture";
import { expect, test } from "@playwright/test";

test.describe('Qwik functionality', () => {
  test.beforeEach(async () => {
    // Clean up before each test to ensure fresh state
    const fixture = await loadFixture({
      root: "../fixtures/minimal"
    });
    await fixture.clean();
  });

  test("Qwik container is SSR rendered in dev mode", async ({ page }) => {
    const fixture = await loadFixture({
      root: "../fixtures/minimal"
    });

    const devServer = await fixture.startDevServer({});
    try {
      const pageUrl = fixture.resolveUrl("/");
      const response = await page.goto(pageUrl);

      if (!response?.ok()) {
        throw new Error(`Failed to load page: ${response?.status()} ${response?.statusText()}`);
      }

      await expect(page.locator("[q\\:container]").first()).toBeVisible();
    } finally {
      await devServer.stop();
    }
  });

  test("Qwik container is SSR rendered in production", async ({ page }) => {
    const fixture = await loadFixture({
      root: "../fixtures/minimal",
      // Explicitly set output mode
      output: 'static',
      // Ensure clean build
      cacheDir: './.cache',
      outDir: './dist'
    });

    // Ensure sync before build
    await fixture.sync({});
    
    console.log()
    // Build with explicit configuration
    const seeBuild = await fixture.build({
      mode: 'production'
    });

    console.log("SEE BUILD: ", seeBuild)

    const preview = await fixture.preview({});
    try {
      const pageUrl = fixture.resolveUrl("/");
      const response = await page.goto(pageUrl);

      if (!response?.ok()) {
        throw new Error(`Failed to load page: ${response?.status()} ${response?.statusText()}`);
      }

      await expect(page.locator("[q\\:container]").first()).toBeVisible();
    } finally {
      await preview.stop();
    }
  });

  test("Counter increments on click", async ({ page }) => {
    const fixture = await loadFixture({
      root: "../fixtures/minimal"
    });

    const devServer = await fixture.startDevServer({});
    try {
      const pageUrl = fixture.resolveUrl("/");
      await page.goto(pageUrl);

      const counter = page.getByTestId("counter");
      await expect(counter).toBeVisible();
      await counter.click();
      await expect(counter).toHaveText("1");
    } finally {
      await devServer.stop();
    }
  });
});