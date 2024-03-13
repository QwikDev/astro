import { defineConfig } from "astro/config";

import qwik from "@qwikdev/astro";
import node from "@astrojs/node";
import react from "@astrojs/react";

// https://astro.build/config
export default defineConfig({
  output: "server",
  adapter: node({
    mode: "standalone"
  }),

  integrations: [qwik({ include: "**/qwik/*" }), react({ include: "**/react/*" })]
});
