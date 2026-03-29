import mdx from "@astrojs/mdx";
import qwik from "@qwik.dev/astro";
import icon from "astro-icon";
import { defineConfig } from "astro/config";

// https://astro.build/config
export default defineConfig({
  site: "https://astro.qwik.dev",
  prefetch: {
    prefetchAll: true,
    defaultStrategy: "viewport",
  },
  integrations: [qwik({ clientRouter: true }), icon(), mdx()],
  markdown: {
    shikiConfig: {
      themes: {
        light: "github-light",
        dark: "github-dark",
      },
      defaultColor: false,
    },
  },
  image: {
    domains: ["img.youtube.com", "avatars.githubusercontent.com"],
  },
});
