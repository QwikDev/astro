import { fileURLToPath } from "node:url";
import { expect, test } from "@playwright/test";
import { dev } from "astro";

const fixtureDir = fileURLToPath(new URL("../fixtures/minimal/", import.meta.url));

test.describe("Development Server", () => {
  let devServer: Awaited<ReturnType<typeof dev>>;

  test.beforeAll(async () => {
    devServer = await dev({
      root: fixtureDir,
      server: { host: "127.0.0.1", port: 0 }
    });
  });

  test.afterAll(async () => {
    await devServer?.stop();
  });

  test("renders Qwik components without a production manifest", async () => {
    const response = await fetch(`http://127.0.0.1:${devServer.address.port}/`);
    const html = await response.text();

    expect(response.ok).toBe(true);
    expect(html).toContain("q:container");
    expect(html).toContain('q:manifest-hash="dev"');
    expect(html).toContain('data-testid="counter"');
  });
});
