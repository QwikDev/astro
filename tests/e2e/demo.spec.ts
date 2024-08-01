import { expect, test } from "@playwright/test";

test("has title", async ({ page }) => {
  await page.goto("http://localhost:4321/");

  await expect(page).toHaveTitle(/Astro/);
});

test("test link", async ({ page }) => {
  await page.goto("http://localhost:4321/");

  await page.getByRole("link", { name: "test" }).click();

  const backToHome = page.getByRole("link", { name: "Back home" });

  await expect(backToHome).toBeVisible();

  await backToHome.click();

  expect(await page.title()).toBe("Astro");
});
