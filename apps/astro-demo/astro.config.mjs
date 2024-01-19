import { defineConfig } from "astro/config";
import qwik from "@qwikdev/astro";
import react from "@astrojs/react";
import vercel from "@astrojs/vercel/serverless";

// https://astro.build/config
export default defineConfig({
  output: "server",
  adapter: vercel(),
  integrations: [qwik(), react({ include: ["**/react/*"] })],
});
