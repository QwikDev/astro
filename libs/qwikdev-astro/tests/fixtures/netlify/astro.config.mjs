import { defineConfig } from "astro/config";
import netlify from "@astrojs/netlify";
import qwik from "@qwik.dev/astro";

export default defineConfig({
  output: "server",
  adapter: netlify(),
  integrations: [qwik()]
});
