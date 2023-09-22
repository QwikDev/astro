import { qwikVite } from "@builder.io/qwik/optimizer";
import inspect from "vite-plugin-inspect";
export default function createIntegration() {
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
