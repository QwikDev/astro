import { defineConfig } from "@playwright/test";

/**
 * Each adapter test runs its own Astro build() which registers global state.
 * Tests run sequentially (workers: 1) with each file in its own worker process.
 */
export default defineConfig({
  projects: [
    {
      name: "static",
      testMatch: "minimal.test.ts",
      testDir: "./libs/qwikdev-astro/tests/platform"
    },
    {
      name: "preview",
      testMatch: "preview.test.ts",
      testDir: "./libs/qwikdev-astro/tests/platform"
    },
    {
      name: "dev",
      testMatch: "dev.test.ts",
      testDir: "./libs/qwikdev-astro/tests/platform"
    },
    {
      name: "node",
      testMatch: "node.test.ts",
      testDir: "./libs/qwikdev-astro/tests/platform"
    },
    {
      name: "vercel",
      testMatch: "vercel.test.ts",
      testDir: "./libs/qwikdev-astro/tests/platform"
    },
    {
      name: "netlify",
      testMatch: "netlify.test.ts",
      testDir: "./libs/qwikdev-astro/tests/platform"
    }
  ],
  timeout: 60000,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: "html",
  use: {
    trace: "on-first-retry"
  }
});
