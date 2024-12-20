import { defineConfig, passthroughImageService } from "astro/config";

import deno from "@astrojs/deno";
import qwikdev from "@qwikdev/astro";

// https://astro.build/config
export default defineConfig({
  output: "server",
  image: {
    service: passthroughImageService(),
  },
  adapter: deno(),
  integrations: [qwikdev()],
});
