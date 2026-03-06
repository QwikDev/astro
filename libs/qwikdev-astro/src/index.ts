import { qwikVite } from "@qwik.dev/core/optimizer";
import type { QwikManifest, QwikVitePluginOptions } from "@qwik.dev/core/optimizer";
import aikMod from "@inox-tools/aik-mod";
import type { AstroConfig, AstroIntegration } from "astro";
import {
  createResolver,
  defineIntegration,
  watchDirectory,
  withPlugins
} from "astro-integration-kit";
import { type ViteBuilder, createFilter } from "vite";
import { INTEGRATION_NAME, VIRTUAL_MODULE_NAME, optionsSchema } from "./constants";
import { createAstroQwikPostPlugin, createQwikBuildFixPlugin, runQwikClientBuild, stripOutputOptions } from "./plugins";
import { createQwikFileFilter, resolveQwikPaths, scanQwikEntrypoints } from "./scan";
import type { SetupPropsWithAikMod } from "./types";

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
    const { resolve: resolver } = createResolver(import.meta.url);
    const filter = createFilter(options?.include, options?.exclude);

    const lifecycleHooks: AstroIntegration["hooks"] = {
      "astro:config:setup": async (setupProps) => {
        const { addRenderer, updateConfig, config, command, defineModule } =
        setupProps as SetupPropsWithAikMod;
        astroConfig = config;
        const isDev = command === "dev";

        // integration HMR support
        watchDirectory(setupProps, resolver());
        
        addRenderer({
          name: "@qwikdev/astro",
          serverEntrypoint: resolver("../server.ts")
        });

        defineModule(VIRTUAL_MODULE_NAME, {
          constExports: {
            renderOpts: options?.renderOpts ?? {}
          }
        });

        ({ srcDir, serverDir, finalDir } = resolveQwikPaths(astroConfig));

        const fileFilter = createQwikFileFilter(filter);
        const qwikBuildFixPlugin = createQwikBuildFixPlugin(() => qwikManifest);
        const astroQwikPostPlugin = createAstroQwikPostPlugin(isDev);

        const qwikSetupConfig: QwikVitePluginOptions = {
          fileFilter,
          devSsrServer: false,
          srcDir,
          ssr: {
            input: resolver("../server.ts")
          },
          client: {
            input: resolver("./root.tsx"),
            outDir: finalDir
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
            resolve: {
              noExternal: ["@qwik.dev/core", "@qwik-client-manifest"]
            },
            plugins: [
              qwikBuildFixPlugin,
              ...qwikPlugins,
              astroQwikPostPlugin
            ]
          }
        });
      },

      // Override buildApp to run Qwik client build before Astro's prerender.
      "astro:build:setup": async ({ vite }) => {
        const config = astroConfig;
        if (!config) throw new Error("[qwikdev/astro] astroConfig not set — astro:config:setup must run first");

        const { builder } = vite;
        
        if (!builder?.buildApp) return;

        const originalBuildApp = builder.buildApp;
        builder.buildApp = async (b: ViteBuilder) => {
          const entrypoints = await scanQwikEntrypoints(config, filter, options?.debug);

          if (entrypoints.size > 0) {
            await runQwikClientBuild({
              entrypoints,
              rootEntry: resolver("./root.tsx"),
              srcDir,
              serverDir,
              finalDir,
              debug: options?.debug ?? false,
              onManifest: (manifest) => { qwikManifest = manifest; }
            });
          }

          await originalBuildApp(b);
        };
      }
    };

    return withPlugins({
      name: INTEGRATION_NAME,
      hooks: lifecycleHooks,
      plugins: [aikMod]
    });
  }
});
