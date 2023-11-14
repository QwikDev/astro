import node from "@astrojs/node";
import qwik from "@qwikdev/astro";
import { defineConfig } from "astro/config";

// https://astro.build/config
export default defineConfig({
  output: "server",
  adapter: node({
    mode: "standalone",
  }),
  integrations: [qwik({
    exclude: [
      "**/react/*",
      "**/react-*",
    ]
  })],
});
