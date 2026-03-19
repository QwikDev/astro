import { defineConfig } from "astro/config";
import vercel from "@astrojs/vercel";
import qwik from "@qwikdev/astro";

export default defineConfig({
  output: "server",
  adapter: vercel(),
  integrations: [qwik()]
});
