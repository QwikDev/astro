import { defineConfig, passthroughImageService } from "astro/config";

import deno from "@deno/astro-adapter";
import qwik from "@qwik.dev/astro";

// https://astro.build/config
export default defineConfig({
  output: "server",
  image: {
    service: passthroughImageService(),
  },
  adapter: deno(),
  integrations: [qwik()],
});
