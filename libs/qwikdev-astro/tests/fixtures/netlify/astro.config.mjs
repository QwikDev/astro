import netlify from "@astrojs/netlify";
import qwik from "@qwik.dev/astro";
import { defineConfig } from "astro/config";

export default defineConfig({
  output: "server",
  adapter: netlify(),
  integrations: [qwik()]
});
