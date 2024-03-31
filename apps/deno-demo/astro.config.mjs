import { defineConfig, passthroughImageService } from "astro/config";

import deno from "@astrojs/deno";
import react from "@astrojs/react";
import qwik from "@qwikdev/astro";

// https://astro.build/config
export default defineConfig({
  output: "server",
  image: {
    service: passthroughImageService()
  },
  adapter: deno(),
  integrations: [qwik({ include: "**/qwik/*" }), react({ include: "**/react/*" })]
});
