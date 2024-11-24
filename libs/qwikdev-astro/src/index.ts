import os from "node:os";
import { normalize, relative } from "node:path";

import type { AstroConfig, AstroIntegration } from "astro";
import { createResolver, defineIntegration, watchDirectory } from "astro-integration-kit";
import { z } from "astro/zod";

import { qwikVite } from "@builder.io/qwik/optimizer";
import type { QwikVitePluginOptions, SymbolMapperFn } from "@builder.io/qwik/optimizer";
import { symbolMapper } from "@builder.io/qwik/optimizer";

import { build, createFilter } from "vite";
import type { PluginOption } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";

declare global {
  var symbolMapperFn: SymbolMapperFn;
  var hash: string | undefined;
}

/* Similar to vite's FilterPattern */
const FilterPatternSchema = z.union([
  z.string(),
  z.instanceof(RegExp),
  z.array(z.union([z.string(), z.instanceof(RegExp)])).readonly(),
  z.null()
]);

/**
 * This project uses Astro Integration Kit.
 * @see https://astro-integration-kit.netlify.app/
 */
export default defineIntegration({
  name: "@qwikdev/astro",
  optionsSchema: z
    .object({
      /**
       * Tell Qwik which files to process.
       */
      include: FilterPatternSchema.optional(),

      /**
       * Tell Qwik which files to ignore.
       */
      exclude: FilterPatternSchema.optional(),

      /**
       * Enable debug mode with the qwikVite plugin.
       */
      debug: z.boolean().optional()
    })
    .optional(),

  setup({ options }) {
    let srcDir = "";
    let outDir = "";

    let astroConfig: AstroConfig | null = null;

    const { resolve: resolver } = createResolver(import.meta.url);
    const filter = createFilter(options?.include, options?.exclude);

    const lifecycleHooks: AstroIntegration["hooks"] = {
      "astro:config:setup": async (setupProps) => {
        const { addRenderer, updateConfig, config, command, injectScript } = setupProps;

        // integration HMR support
        watchDirectory(setupProps, resolver());

        // Because Astro uses the same port for both dev and preview, we need to unregister the SW in order to avoid a stale SW in dev mode.
        if (command === "dev") {
          const unregisterSW =
            "navigator.serviceWorker.getRegistration().then((r) => r && r.unregister())";

          injectScript("head-inline", unregisterSW);
        }

        // Update the global config
        astroConfig = config;
        // Retrieve Qwik files from the project source directory
        srcDir = relative(astroConfig.root.pathname, astroConfig.srcDir.pathname);

        addRenderer({
          name: "@qwikdev/astro",
          serverEntrypoint: "@qwikdev/astro/server"
        });

        // Update the global dist directory
        outDir = astroConfig.outDir.pathname;

        // checks all windows platforms and removes drive ex: C:\\
        if (os.platform() === "win32") {
          outDir = outDir.substring(3);
        }

        /** We need to get the symbolMapper straight from qwikVite here. You can think of it as the "manifest" for dev mode. */
        const symbolMapperPlugin: PluginOption = {
          name: "grabSymbolMapper",
          configResolved() {
            globalThis.symbolMapperFn = symbolMapper;
          }
        };

        /** check if the file should be processed based on the 'transform' hook and user-defined filters (include & exclude) */
        const fileFilter = (id: string, hook: string) => {
          if (hook === "transform" && !filter(id)) {
            return false;
          }

          return true;
        };

        const qwikViteConfig: QwikVitePluginOptions = {
          fileFilter,
          devSsrServer: false,
          srcDir,
          ssr: {
            input: "@qwikdev/astro/server"
          },
          debug: options?.debug ?? false
        };

        const overrideEsbuildPlugin: PluginOption = {
          // override qwikVite's attempt to set `esbuild` to false during dev
          name: "overrideEsbuild",
          enforce: "post",
          config(config) {
            config.esbuild = {};
            return config;
          }
        };

        updateConfig({
          vite: {
            build: {
              rollupOptions: {
                output: {
                  inlineDynamicImports: false
                }
              }
            },
            plugins: [
              symbolMapperPlugin,
              qwikVite(qwikViteConfig),
              tsconfigPaths(),
              overrideEsbuildPlugin
            ]
          }
        });
      },

      "astro:config:done": async ({ config }) => {
        astroConfig = config;
      },

      "astro:build:start": async ({ logger }) => {
        logger.info("astro:build:start");
        const buildOutput = (await build({
          mode: "production",
          ssr: false,
          ...astroConfig?.vite,
          plugins: [...(astroConfig?.vite.plugins || [])]
        })) as any;

        console.log("BUILD OUTPUT: ", buildOutput.output);

        const manifest = buildOutput.output.find((o) => o.fileName === "q-manifest.json");

        console.log("MANIFEST: ", manifest);

        const parsedManifest = JSON.parse(manifest.source);
        console.log("PARSED MANIFEST: ", parsedManifest);
      },

      "astro:build:done": async () => {
        let outputPath: string;

        if (!astroConfig) {
          throw new Error("Qwik Astro: there is no astro config present.");
        }

        if (astroConfig.output === "server" || astroConfig.output === "hybrid") {
          outputPath = astroConfig.build.client.pathname;
        } else {
          outputPath = astroConfig.outDir.pathname;
        }

        // checks all windows platforms and removes drive ex: C:\\
        if (os.platform() === "win32") {
          outputPath = outputPath.substring(3);
        }

        const normalizedPath = normalize(outputPath);
        process.env.Q_BASE = normalizedPath;
      }
    };

    return {
      hooks: lifecycleHooks
    };
  }
});
