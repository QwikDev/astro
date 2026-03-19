import { defineConfig } from "astro/config";

import qwik from "@qwik.dev/astro";

// https://astro.build/config
export default defineConfig({
  integrations: [qwik({ include: "**/qwik/*" })]
});
