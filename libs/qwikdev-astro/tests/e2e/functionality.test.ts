import { loadFixture } from "@inox-tools/astro-tests/astroFixture";
import { expect, test } from "@playwright/test";

test("Qwik container is SSR rendered in dev mode", async ({ page }) => {
  const fixture = await loadFixture({
    root: "../fixtures/minimal"
  });

  const devServer = await fixture.startDevServer({});

  console.log("DEV SERVER URL: ", devServer);

  const pageUrl = await fixture.resolveUrl("/");

  console.log("PAGE URL: ", pageUrl);
  const response = await page.goto(pageUrl);

  if (!response?.ok()) {
    console.error("Response status:", response?.status());
    console.error("Response status text:", response?.statusText());
    console.error("Page content:", await page.content());
  }

  await expect(page.locator("q:container")).toBeVisible();
});
