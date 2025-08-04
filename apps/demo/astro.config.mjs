import { defineConfig } from "astro/config";

import qwik from "@qwikdev/astro";

// https://astro.build/config
export default defineConfig({
  integrations: [qwik({ include: "**/qwik/*" })]
});
