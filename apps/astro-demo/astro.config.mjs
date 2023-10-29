import { defineConfig } from "astro/config";
import qwik from "@astrojs/qwik";
import node from "@astrojs/node";

// https://astro.build/config
export default defineConfig({
  integrations: [qwik()],
  output: "static",
  adapter: node({ mode: "standalone" }),
});
