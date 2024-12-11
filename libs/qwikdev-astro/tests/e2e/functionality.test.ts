import { loadFixture } from "@inox-tools/astro-tests/astroFixture";
import { expect, test } from "@playwright/test";

function clearGlobalState() {
  (globalThis as any).qManifest = undefined;
  (globalThis as any).symbolMapperFn = undefined;
}

test.describe("Dev Mode", () => {
  let devServer: any;
  let fixture: any;

  test.beforeAll(async () => {
    console.log("BEFORE ALL!!!");

    clearGlobalState();

    fixture = await loadFixture({
      root: "../fixtures/minimal",
      devToolbar: {
        enabled: false
      }
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
      logLevel: "debug"
      // Add hooks configuration to ensure config:setup runs
    });

    clearGlobalState();

    console.log("Building");
    await fixture.build({
      mode: "development" // Then switch to production
    });

    console.log("Starting preview server");
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
