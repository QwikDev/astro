import { defineConfig } from "astro/config";
import node from "@astrojs/node";
import qwik from "@qwik.dev/astro";

export default defineConfig({
  output: "server",
  adapter: node({ mode: "standalone" }),
  integrations: [qwik()]
});
