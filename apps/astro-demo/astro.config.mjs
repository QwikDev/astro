import { defineConfig } from "astro/config";
import node from "@astrojs/node";
import qwik from "@qwikdev/astro";
import react from "@astrojs/react";

// https://astro.build/config
export default defineConfig({
  output: "static",
  adapter: node({
    mode: "standalone",
  }),
  integrations: [qwik(), react({ include: ["**/react/*"] })],
});
