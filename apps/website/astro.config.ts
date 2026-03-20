import mdx from "@astrojs/mdx";
import qwik from "@qwik.dev/astro";
import icon from "astro-icon";
import { defineConfig } from "astro/config";

// https://astro.build/config
export default defineConfig({
  integrations: [qwik(), icon(), mdx()]
});
