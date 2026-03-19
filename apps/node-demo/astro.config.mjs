import { defineConfig } from "astro/config";

import node from "@astrojs/node";
import qwik from "@qwik.dev/astro";

// https://astro.build/config
export default defineConfig({
  output: "server",
  adapter: node({
    mode: "standalone"
  }),
  integrations: [qwik({ include: "**/qwik/*" })]
});
