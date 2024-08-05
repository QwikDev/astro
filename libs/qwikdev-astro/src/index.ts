import fs from "node:fs";
import { rmSync } from "node:fs";
import os from "node:os";
import { normalize, relative } from "node:path";

import type { AstroConfig, AstroIntegration } from "astro";
import { createResolver, defineIntegration, watchDirectory } from "astro-integration-kit";
import { z } from "astro/zod";

import { qwikVite } from "@builder.io/qwik/optimizer";
import type { QwikVitePluginOptions, SymbolMapperFn } from "@builder.io/qwik/optimizer";
import { symbolMapper } from "@builder.io/qwik/optimizer";

import { build, createFilter } from "vite";
import type { InlineConfig, PluginOption } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";

import { getQwikEntrypoints, qwikModules } from "./entrypoints";
import { moveArtifacts, newHash } from "./utils";

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
       * @type {string | RegExp | (string | RegExp)[] | null}
       */
      include: FilterPatternSchema.optional(),

      /**
       * Tell Qwik which files to ignore.
       * @type {string | RegExp | (string | RegExp)[] | null}
       */
      exclude: FilterPatternSchema.optional(),

      /**
       * Enable debug mode with the qwikVite plugin.
       * @type {boolean}
       */
      debug: z.boolean().optional()
    })
    .optional(),

  setup({ options }) {
    let srcDir = "";
    let outDir = "";
    const tempDir = `tmp-${newHash()}`;

    let astroConfig: AstroConfig | null = null;
    let entrypoints: Promise<string[]>;

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

        entrypoints = getQwikEntrypoints(srcDir, filter);

        if ((await entrypoints).length !== 0) {
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
            try {
              const content = fs.readFileSync(id, "utf-8");
              if (qwikModules.some((module) => content.includes(module))) {
                return true;
              }
            } catch (error) {
              // file can't be read, silently continue
            }

            if (hook === "transform" && !filter(id)) {
              return false;
            }

            return true;
          };

          const qwikViteConfig: QwikVitePluginOptions = {
            fileFilter,
            devSsrServer: false,
            srcDir,
            client: {
              input: await entrypoints
            },
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
        }
      },

      "astro:config:done": async ({ config }) => {
        astroConfig = config;
      },

      "astro:build:start": async ({ logger }) => {
        logger.info("astro:build:start");

        if ((await entrypoints).length > 0) {
          // make sure vite does not parse .astro files in the qwik integration
          const astroNoopPlugin: PluginOption = {
            enforce: "pre",
            name: "astro-noop",

            load(id: string) {
              if (id.endsWith(".astro")) {
                return "export default function() {}";
              }
              return null;
            }
          };

          // client build that we pass back to the server build
          await build({
            ...astroConfig?.vite,
            plugins: [...(astroConfig?.vite.plugins || []), astroNoopPlugin]
          } as InlineConfig);

          await moveArtifacts(outDir, tempDir);
        } else {
          logger.info("No entrypoints found. Skipping build.");
        }
      },

      "astro:build:done": async ({ logger }) => {
        if ((await entrypoints).length > 0 && astroConfig) {
          let outputPath: string;
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

          await moveArtifacts(tempDir, normalizedPath);
          // remove the temp dir folder
          rmSync(tempDir, { recursive: true });
        } else {
          logger.info("Build finished. No artifacts moved.");
        }
      }
    };

    return {
      hooks: lifecycleHooks
    };
  }
});
