import { defineConfig } from "astro/config";
import qwik from "@qwikdev/astro";
import node from "@astrojs/node";

// https://astro.build/config
export default defineConfig({
  integrations: [qwik()],
  adapter: node({
    mode: "standalone",
  }),
  output: "server",
});
