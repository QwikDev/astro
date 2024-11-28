import { loadFixture } from "@inox-tools/astro-tests/astroFixture";
import { expect, test } from "@playwright/test";

test("Qwik container is SSR rendered in dev mode", async ({ page }) => {
  const fixture = await loadFixture({
    root: "./fixtures/minimal"
  });

  await fixture.startDevServer({});

  await page.goto("/");
  await expect(page.locator("q:container")).toBeVisible();
});
