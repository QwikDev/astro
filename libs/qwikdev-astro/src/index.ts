import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { qwikVite } from "@qwik.dev/core/optimizer";
import type { QwikManifest, QwikVitePluginOptions } from "@qwik.dev/core/optimizer";
import type { AstroConfig, AstroIntegration } from "astro";
import { defineIntegration, watchDirectory } from "astro-integration-kit";
import type { Plugin } from "vite";
import { type ViteBuilder, createFilter } from "vite";
import {
  INTEGRATION_NAME,
  ROOT_ENTRYPOINT,
  SERVER_ENTRYPOINT,
  VIRTUAL_MODULE_NAME,
  optionsSchema
} from "./constants";
import {
  createAstroQwikPostPlugin,
  createQwikManifestPlugin,
  runQwikClientBuild,
  stripOutputOptions
} from "./plugins";
import { createQwikFileFilter, resolveQwikPaths, scanQwikEntrypoints } from "./scan";

const RESOLVED_VIRTUAL_ID = `\0${VIRTUAL_MODULE_NAME}`;

function createVirtualModulePlugin(renderOpts: unknown, clientRouter: boolean): Plugin {
  return {
    name: "qwik-astro:virtual",
    resolveId(id) {
      if (id === VIRTUAL_MODULE_NAME) return RESOLVED_VIRTUAL_ID;
      return undefined;
    },
    load(id) {
      if (id === RESOLVED_VIRTUAL_ID) {
        return `export const renderOpts = ${JSON.stringify(renderOpts)};
export const clientRouter = ${JSON.stringify(clientRouter)};`;
      }
      return undefined;
    }
  };
}

/**
 * This project uses Astro Integration Kit.
 * @see https://astro-integration-kit.netlify.app/
 */
export default defineIntegration({
  name: INTEGRATION_NAME,
  optionsSchema,

  setup({ options }) {
    let srcDir = "";
    let serverDir = "";
    let finalDir = "";

    let qwikManifest: QwikManifest | null = null;

    let astroConfig: AstroConfig | null = null;
    const packageDir = dirname(fileURLToPath(import.meta.url));
    const filter = createFilter(options?.include, options?.exclude);

    const lifecycleHooks: AstroIntegration["hooks"] = {
      "astro:config:setup": async (setupProps) => {
        const { addRenderer, updateConfig, config, command } = setupProps;
        astroConfig = config;
        const isDev = command === "dev";

        // integration HMR support
        watchDirectory(setupProps, packageDir);

        addRenderer({
          name: INTEGRATION_NAME,
          serverEntrypoint: SERVER_ENTRYPOINT
        });

        ({ srcDir, serverDir, finalDir } = resolveQwikPaths(astroConfig));

        const fileFilter = createQwikFileFilter(filter);
        const qwikManifestPlugin = createQwikManifestPlugin(() => qwikManifest);
        const astroQwikPostPlugin = createAstroQwikPostPlugin(isDev);
        const virtualModulePlugin = createVirtualModulePlugin(
          options?.renderOpts ?? {},
          options?.clientRouter ?? false
        );

        const qwikSetupConfig: QwikVitePluginOptions = {
          fileFilter,
          srcDir,
          ssr: {
            input: SERVER_ENTRYPOINT
          },
          client: {
            input: ROOT_ENTRYPOINT,
            outDir: finalDir
          },
          devTools: {
            hmr: false
          },
          debug: options?.debug ?? false
        };

        const qwikPlugins = qwikVite(qwikSetupConfig);

        if (!isDev) {
          stripOutputOptions(qwikPlugins);
        }

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
              virtualModulePlugin,
              qwikManifestPlugin,
              ...qwikPlugins,
              astroQwikPostPlugin
            ]
          }
        });
      },

      // Override buildApp to run Qwik client build before Astro's prerender.
      "astro:build:setup": async ({ vite }) => {
        const config = astroConfig;
        if (!config)
          throw new Error(
            "[qwikdev/astro] astroConfig not set — astro:config:setup must run first"
          );

        const { builder } = vite;

        if (!builder?.buildApp) return;

        const originalBuildApp = builder.buildApp;
        builder.buildApp = async (b: ViteBuilder) => {
          const entrypoints = await scanQwikEntrypoints(config, filter, options?.debug);

          if (entrypoints.size > 0) {
            await runQwikClientBuild({
              entrypoints,
              rootEntry: ROOT_ENTRYPOINT,
              srcDir,
              serverDir,
              finalDir,
              debug: options?.debug ?? false,
              onManifest: (manifest) => {
                qwikManifest = manifest;
              }
            });
          }

          await originalBuildApp(b);
        };
      }
    };

    return {
      name: INTEGRATION_NAME,
      hooks: lifecycleHooks
    };
  }
});
