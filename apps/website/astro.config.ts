import qwik from "@qwikdev/astro";
import starlight from "@astrojs/starlight";
import tailwind from "@astrojs/tailwind";
import { defineConfig } from "astro/config";

// https://astro.build/config
export default defineConfig({
  compressHTML: true,
  integrations: [qwik(), starlight({
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
    components: {
      Sidebar: './src/components/sidebar/sidebar.astro'
    }
  }), tailwind({
    applyBaseStyles: false
  })]
});