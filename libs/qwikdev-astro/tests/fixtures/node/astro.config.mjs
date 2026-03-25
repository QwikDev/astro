import node from "@astrojs/node";
import qwik from "@qwik.dev/astro";
import { defineConfig } from "astro/config";

export default defineConfig({
  output: "server",
  adapter: node({ mode: "standalone" }),
  integrations: [qwik()]
});
