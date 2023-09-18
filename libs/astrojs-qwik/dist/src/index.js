import { qwikVite } from "@builder.io/qwik/optimizer";
function getRenderer() {
    return {
        name: "@astrojs/qwik",
        serverEntrypoint: "@astrojs/qwik/server",
    };
}
// qwikRollup({ target: "ssr" })
async function getViteConfiguration() {
    const config = {
        plugins: [
            qwikVite({
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
export default function createIntegration() {
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
