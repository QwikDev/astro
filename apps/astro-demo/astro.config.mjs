import { defineConfig } from "astro/config";
import qwik from "@qwikdev/astro";
import node from "@astrojs/node";

// https://astro.build/config
export default defineConfig({
  integrations: [qwik()],
  output: "server",
  adapter: node({
    mode: "standalone",
  }),
  outDir: "./test",
});
