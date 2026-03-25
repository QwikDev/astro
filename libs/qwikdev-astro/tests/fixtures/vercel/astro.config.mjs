import vercel from "@astrojs/vercel";
import qwik from "@qwik.dev/astro";
import { defineConfig } from "astro/config";

export default defineConfig({
  output: "server",
  adapter: vercel(),
  integrations: [qwik()]
});
