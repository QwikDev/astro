import { defineConfig } from "astro/config";

import qwik from "@qwikdev/astro";

// https://astro.build/config
export default defineConfig({
  integrations: [qwik({ include: "**/qwik/*", renderOpts: { base: "http://192.168.68.76:4321/build" } })]
});
