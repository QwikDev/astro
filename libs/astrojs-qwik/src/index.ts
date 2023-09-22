import type { AstroIntegration, AstroRenderer } from "astro";
import { qwikVite } from "@builder.io/qwik/optimizer";
import type { UserConfig } from "vite";
import inspect from "vite-plugin-inspect";

export default function createIntegration(): AstroIntegration {
  return {
    name: "@astrojs/qwik",
    hooks: {
      "astro:config:setup": async (args) => {
        const { addRenderer, updateConfig } = args;
        console.log(args);

        addRenderer({
          name: "@astrojs/qwik",
          serverEntrypoint: "@astrojs/qwik/server",
        });

        updateConfig({
          vite: {
            plugins: [
              qwikVite({
                debug: true,
                client: { input: "./src/components/Hello.tsx" },
                ssr: { input: "./src/components/Hello.tsx" },
              }),
              inspect({ build: true }),
            ],
          },
        });
      },
    },
  };
}
