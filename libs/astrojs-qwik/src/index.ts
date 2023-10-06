import type { AstroIntegration, AstroRenderer } from "astro";
import { qwikVite, type QwikManifest } from "@builder.io/qwik/optimizer";
import type { UserConfig } from "vite";
import inspect from "vite-plugin-inspect";
// import manifest from "../../../apps/astro-demo/dist/client/q-manifest.json";

export default function createIntegration(): AstroIntegration {
  return {
    name: "@astrojs/qwik",
    hooks: {
      "astro:config:setup": async (args) => {
        const { addRenderer, updateConfig } = args;
        // console.log(args);

        addRenderer({
          name: "@astrojs/qwik",
          serverEntrypoint: "@astrojs/qwik/server",
          clientEntrypoint: "./src/root.tsx",
        });

        updateConfig({
          vite: {
            // buildMode: "production",
            plugins: [
              qwikVite({
                client: {
                  // input: "./src/components/counter.tsx",
                  // devInput: "./src/components/counter.tsx",
                  // manifestOutput: (manifest: QwikManifest) => {
                  //   console.error("yey got manifest", manifest);
                  //   myManifest = manifest;
                  // },
                },
                ssr: {
                  input: "./src/entry.ssr.tsx",
                  // manifestInput: manifest,
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
