import { defineConfig } from "astro/config";
import netlify from "@astrojs/netlify";
import qwik from "@qwikdev/astro";

export default defineConfig({
  output: "server",
  adapter: netlify(),
  integrations: [qwik()]
});
