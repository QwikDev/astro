import { defineConfig } from "astro/config";
import inspect from "vite-plugin-inspect";
import node from "@astrojs/node";

import qwik from "@qwikdev/astro";
import react from "@astrojs/react";

// https://astro.build/config
export default defineConfig({
  output: "server",
  adapter: node({
    mode: "standalone",
  }),
  vite: {
    plugins: [inspect()],
  },
  integrations: [
    react({ include: ["**/react/*"] }),
    qwik({ include: ["**/qwik/*"] }),
  ],
});
