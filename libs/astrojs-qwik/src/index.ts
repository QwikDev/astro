import type { AstroIntegration, AstroRenderer } from "astro";
import { qwikVite } from "@builder.io/qwik/optimizer";
import type { UserConfig } from "vite";

function getRenderer(): AstroRenderer {
  return {
    name: "@astrojs/qwik",
    serverEntrypoint: "@astrojs/qwik/server",
  };
}

async function getViteConfiguration(): Promise<UserConfig> {
  const config: UserConfig = {
    plugins: [
      qwikVite({
        debug: true,
        client: {
          input: "@astrojs/qwik/root",
          devInput: "@astrojs/qwik/dev",
        },
        ssr: {
          input: "@astrojs/qwik/ssr",
        },
      }),
    ],
  };

  return config;
}

export default function createIntegration(): AstroIntegration {
  return {
    name: "@astrojs/qwik",
    hooks: {
      "astro:config:setup": async ({ addRenderer, updateConfig }) => {
        addRenderer(getRenderer());
        updateConfig({ vite: await getViteConfiguration() });
      },
    },
  };
}
