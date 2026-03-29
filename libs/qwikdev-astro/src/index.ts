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

const QWIK_NOEXTERNAL = ["@qwik.dev/core", "@qwik.dev/core/optimizer"];

/**
 * Ensures Qwik packages are in `resolve.noExternal` at the per-environment level.
 *
 * Qwik core's `qwikVite` plugin has a `configEnvironment` hook that does this,
 * but it only targets `name === 'ssr'`. Astro 6 creates additional server environments
 * (e.g. "prerender") that also need noExternal. Vite 7 sets `consumer: "server"` for
 * any non-client environment, but qwik checks `name` not `consumer` because `consumer`
 * isn't set yet when `configEnvironment` runs.
 *
 * Upstream fix: qwik-evolution #318 (remove need for noExternal entirely).
 * Interim core fix: qwikVite's configEnvironment should check all server environments,
 * not just `name === 'ssr'`.
 *
 * @see https://github.com/QwikDev/qwik-evolution/discussions/318
 * @see https://github.com/QwikDev/qwik/blob/main/packages/qwik/src/optimizer/src/plugins/vite.ts#L374
 */
function createQwikNoExternalPlugin(): Plugin {
  return {
    name: "qwik-astro:noexternal",
    enforce: "pre",
    configEnvironment(_name, options) {
      const existing = options.resolve?.noExternal;
      if (existing === true) return;

      let current: (string | RegExp)[];
      if (Array.isArray(existing)) current = existing;
      else if (existing) current = [existing];
      else current = [];

      return {
        resolve: {
          noExternal: [...current, ...QWIK_NOEXTERNAL]
        }
      };
    }
  };
}

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
        const qwikNoExternalPlugin = createQwikNoExternalPlugin();
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
            ssr: {
              noExternal: ["@qwik.dev/core", "@qwik.dev/core/optimizer"]
            },
            plugins: [
              qwikNoExternalPlugin,
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

        const astroViteConfig = { ...vite };
        delete (astroViteConfig as Record<string, unknown>).builder;

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
              },
              astroViteConfig
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
