import { defineConfig } from "astro/config";
import { qwikVite } from "@builder.io/qwik/optimizer";
import qwik from "@astrojs/qwik";
import node from "@astrojs/node";

// https://astro.build/config
export default defineConfig({
  integrations: [qwik()],
  output: "server",
  adapter: node({ mode: "standalone" }),
});
