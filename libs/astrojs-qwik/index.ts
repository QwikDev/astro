import type { AstroIntegration, AstroRenderer } from "astro";
import { qwikVite } from "@builder.io/qwik/optimizer";
import type { QwikVitePlugin } from "@builder.io/qwik/optimizer";
import qwikloader from "@builder.io/qwik/qwikloader";

function getRenderer(): AstroRenderer {
  return {
    name: "@astrojs/qwik",
    clientEntrypoint: "",
    serverEntrypoint: "@astrojs/qwik/server.js",
  };
}

export default function createIntegration(): AstroIntegration {
  // See the Integration API docs for full details
  // https://docs.astro.build/en/reference/integrations-reference/
  return {
    name: "@astrojs/qwik",
    hooks: {
      "astro:config:setup": () => {
        // See the @astrojs/react integration for an example
        // https://github.com/withastro/astro/blob/main/packages/integrations/react/src/index.ts
      },
      "astro:build:setup": ({ config, updateConfig }) => {
        // See the @astrojs/netlify integration for an example
        // https://github.com/withastro/astro/blob/main/packages/integrations/netlify/src/integration-functions.ts
      },
      "astro:build:done": ({ dir, routes }) => {
        // See the @astrojs/partytown integration for an example
        // https://github.com/withastro/astro/blob/main/packages/integrations/partytown/src/index.ts
      },
    },
  };
}
