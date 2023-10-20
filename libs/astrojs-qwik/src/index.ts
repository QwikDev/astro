import type { AstroIntegration } from "astro";
import { qwikRollup } from "@builder.io/qwik/optimizer";
import inspect from "vite-plugin-inspect";

export default function createIntegration(): AstroIntegration {
  return {
    name: "@astrojs/qwik",
    hooks: {
      "astro:config:setup": async (args) => {
        const { addRenderer, updateConfig } = args;

        addRenderer({
          name: "@astrojs/qwik",
          serverEntrypoint: "@astrojs/qwik/server",
          clientEntrypoint: "./src/root.tsx",
        });

        updateConfig({
          vite: {
            plugins: [
              qwikRollup({
                debug: true,
                target: "ssr", // TODO: We should not have to hard code this.
              }),
              inspect({ build: true }),
            ],
          },
        });
      },
    },
  };
}
