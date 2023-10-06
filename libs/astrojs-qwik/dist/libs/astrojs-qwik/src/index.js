import { qwikVite } from "@builder.io/qwik/optimizer";
import inspect from "vite-plugin-inspect";
export default function createIntegration() {
    return {
        name: "@astrojs/qwik",
        hooks: {
            "astro:config:setup": async (args) => {
                const { addRenderer, updateConfig } = args;
                // console.log(args);
                addRenderer({
                    name: "@astrojs/qwik",
                    serverEntrypoint: "@astrojs/qwik/server",
                    clientEntrypoint: "./src/components/counter.tsx",
                });
                updateConfig({
                    vite: {
                        // buildMode: "production",
                        plugins: [
                            qwikVite({
                                client: {
                                    input: "./src/components/counter.tsx",
                                    devInput: "./src/components/counter.tsx",
                                    // manifestOutput: (manifest: QwikManifest) => {
                                    //   console.error("yey got manifest", manifest);
                                    //   myManifest = manifest;
                                    // },
                                },
                                ssr: {
                                    input: "./src/components/counter.tsx",
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
