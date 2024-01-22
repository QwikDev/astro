import { defineConfig } from "astro/config";
import qwik from "@qwikdev/astro";
import node from "@astrojs/node";
// import vercel from "@astrojs/vercel/serverless";
// import cloudflare from "@astrojs/cloudflare";

// https://astro.build/config
export default defineConfig({
  output: "server",
  adapter: node({
    mode: "standalone",
  }),
  // adapter: cloudflare(),
  // adapter: vercel(),
  integrations: [qwik()],
});
