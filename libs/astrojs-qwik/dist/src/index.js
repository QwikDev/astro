import { qwikRollup } from "@builder.io/qwik/optimizer";
function getRenderer() {
    return {
        name: "@astrojs/qwik",
        serverEntrypoint: "@astrojs/qwik/server",
    };
}
async function getRollupConfig() {
    const config = {
        plugins: [qwikRollup({})],
    };
    return config;
}
export default function createIntegration() {
    return {
        name: "@astrojs/qwik",
        hooks: {
            "astro:config:setup": async ({ addRenderer, updateConfig }) => {
                addRenderer(getRenderer());
                updateConfig({ rollup: await getRollupConfig() });
            },
        },
    };
}
