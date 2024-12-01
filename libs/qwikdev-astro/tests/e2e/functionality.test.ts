import { loadFixture } from "@inox-tools/astro-tests/astroFixture";
import { expect, test } from "@playwright/test";

test.describe("Dev Mode", () => {
  let devServer: any;
  let fixture: any;

  test.beforeAll(async () => {
    fixture = await loadFixture({
      root: "../fixtures/minimal"
    });
    devServer = await fixture.startDevServer({});
  });

  test.afterAll(async () => {
    await devServer?.stop();
  });

  // Remove individual server setup/teardown from tests
  test("Qwik container is SSR rendered in dev mode", async ({ page }) => {
    const pageUrl = fixture.resolveUrl("/");
    const response = await page.goto(pageUrl);

    if (!response?.ok()) {
      throw new Error(
        `Failed to load page: ${response?.status()} ${response?.statusText()}`
      );
    }

    await expect(page.locator("[q\\:container]").first()).toBeVisible();
  });

  test("Counter increments on click", async ({ page }) => {
    const pageUrl = fixture.resolveUrl("/");
    await page.goto(pageUrl);

    const counter = page.getByTestId("counter");
    await expect(counter).toBeVisible();
    await expect(counter).toHaveText("0");
    await counter.click();
    await expect(counter).toHaveText("1");
  });
});

test.describe("Production Mode", () => {
  let preview: any;
  let fixture: any;

  test.beforeAll(async () => {
    fixture = await loadFixture({
      root: "../fixtures/minimal",
      output: "static",
      cacheDir: "./.cache",
      outDir: "./dist"
    });

    // Ensure sync before build
    await fixture.sync({});

    // Build with explicit configuration
    await fixture.build({
      mode: "production"
    });

    preview = await fixture.preview({});
  });

  test.afterAll(async () => {
    await preview?.stop();
  });

  test("Qwik container is SSR rendered in production", async ({ page }) => {
    const pageUrl = fixture.resolveUrl("/");
    const response = await page.goto(pageUrl);

    if (!response?.ok()) {
      throw new Error(
        `Failed to load page: ${response?.status()} ${response?.statusText()}`
      );
    }

    await expect(page.locator("[q\\:container]").first()).toBeVisible();
  });

  test("Counter increments on click", async ({ page }) => {
    const pageUrl = fixture.resolveUrl("/");
    await page.goto(pageUrl);

    const counter = page.getByTestId("counter");
    await expect(counter).toBeVisible();
    await expect(counter).toHaveText("0");
    await counter.click();
    await expect(counter).toHaveText("1");
  });
});
