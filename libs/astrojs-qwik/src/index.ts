import type { AstroIntegration } from "astro";
import { qwikRollup, qwikVite } from "@builder.io/qwik/optimizer";
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
        });

        updateConfig({
          vite: {
            plugins: [
              // qwikRollup({
              //   debug: true,
              //   entryStrategy: { type: "hook" },
              //   target: "ssr", // TODO: We should not have to hard code this.
              // }),
              qwikVite({
                devSsrServer: false,
                client: {
                  // In order to make a client build, we need to know
                  // all of the entry points to the application so
                  // that we can generate the manifest.
                  input: ["./src/components/counter.tsx"],
                },
                ssr: {
                  input: "./src/components/counter.tsx",
                },
              }),
              inspect({ build: true }),
            ],
          },
        });
      },
    },
  };
}
