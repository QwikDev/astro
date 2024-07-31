import starlight from "@astrojs/starlight";
import { defineConfig } from "astro/config";

import tailwind from "@astrojs/tailwind";

// https://astro.build/config
export default defineConfig({
  compressHTML: true,
  integrations: [starlight({
    title: "Qwik 💜 Astro",
    customCss: ['./src/tailwind.css'],
    logo: {
      src: "./src/assets/qwik-astro.svg",
      alt: "Qwik + Astro Logo",
      replacesTitle: false
    },
    social: {
      github: "https://github.com/QwikDev/astro"
    },
    editLink: {
      baseUrl: "https://github.com/QwikDev/astro/edit/main/apps/website/"
    },
    sidebar: [{
      label: "Home",
      link: "/"
    }, {
      label: "Guides",
      items: [{
        label: "Getting Started",
        link: "/guides/"
      }]
    }, {
      label: "Reference",
      autogenerate: {
        directory: "reference"
      }
    }]
  }), tailwind({ applyBaseStyles: false })]
});