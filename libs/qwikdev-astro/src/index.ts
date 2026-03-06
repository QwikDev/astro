import { qwikVite } from "@qwik.dev/core/optimizer";
import type {
  QwikManifest,
  QwikVitePluginOptions,
} from "@qwik.dev/core/optimizer";
import aikMod from "@inox-tools/aik-mod";
import type { AstroConfig, AstroIntegration } from "astro";
import {
  createResolver,
  defineIntegration,
  watchDirectory,
  withPlugins
} from "astro-integration-kit";
import { type ViteBuilder, build, createFilter } from "vite";
import { INTEGRATION_NAME, QWIK_MODULES, VIRTUAL_MODULE_NAME, optionsSchema } from "./constants";
import { createAstroQwikPostPlugin, createQwikBuildFixPlugin } from "./plugins";
import { getRelativePath, scanQwikEntrypoints } from "./scan";
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
    let clientDir = "";
    let serverDir = "";
    let outDir = "";
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

        /** Relative paths, as the Qwik optimizer handles normalization */
        srcDir = getRelativePath(astroConfig.root.pathname, astroConfig.srcDir.pathname);

        clientDir = getRelativePath(
          astroConfig.root.pathname,
          astroConfig.build.client.pathname
        );

        serverDir = getRelativePath(
          astroConfig.root.pathname,
          astroConfig.build.server.pathname
        );

        outDir = getRelativePath(astroConfig.root.pathname, astroConfig.outDir.pathname);

        if (astroConfig.adapter) {
          finalDir = clientDir;
          if (astroConfig.adapter?.name.includes("vercel")) {
            const outDirUrl = new URL(astroConfig.outDir.pathname, astroConfig.root);
            astroConfig.build.client = outDirUrl;
            finalDir = astroConfig.build.client.pathname;
          }
        } else {
          finalDir = outDir;
        }

        /** check if the file should be processed based on the 'transform' hook and user-defined filters (include & exclude) */
        const fileFilter = (id: string, hook: string) => {
          if (hook === "transform") {
            if (id.includes(".qwik.")) {
              return true;
            }

            if (!filter(id)) {
              return false;
            }
          }

          return true;
        };

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

        // In build mode, strip qwikVite's outputOptions hook — the standalone
        // Qwik client build handles client output. Keep config hook (configResolved
        // depends on state it sets) but undo its output dir changes via post plugin.
        if (!isDev) {
          for (const plugin of qwikPlugins) {
            if (!plugin || typeof plugin !== "object") continue;
            delete plugin.outputOptions;
          }
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
              noExternal: [...QWIK_MODULES]
            },
            plugins: [
              qwikBuildFixPlugin,
              ...qwikPlugins,
              astroQwikPostPlugin
            ]
          }
        });
      },

      "astro:config:done": async ({ config }) => {
        astroConfig = config;
      },

      /**
       * Use astro:build:setup to run the Qwik client build BEFORE Astro's
       * prerender step. Astro 6 uses Vite's Environment API with buildApp()
       * controlling build order. We override buildApp to:
       *   1. Run standalone Qwik client build (generates manifest + chunks)
       *   2. Then run Astro's normal build (prerender has manifest available)
       */
      "astro:build:setup": async ({ vite }) => {
        const originalBuildApp = vite.builder?.buildApp;
        if (!originalBuildApp) return;

        vite.builder!.buildApp = async (builder: ViteBuilder) => {
          // Scan source files for Qwik entrypoints before building
          const entrypoints = await scanQwikEntrypoints(
            astroConfig!,
            filter,
            options?.debug
          );

          if (entrypoints.size > 0) {
            // Run standalone Qwik client build first to generate manifest
            const qwikClientConfig: QwikVitePluginOptions = {
              devSsrServer: false,
              srcDir,
              ssr: {
                input: "@qwikdev/astro/server",
                outDir: serverDir
              },
              client: {
                input: [...entrypoints, resolver("./root.tsx")],
                outDir: finalDir,
                manifestOutput: (manifest) => {
                  qwikManifest = manifest;
                }
              },
              debug: options?.debug ?? false
            };

            await build({
              plugins: [qwikVite(qwikClientConfig)],
              build: {
                ssr: false,
                outDir: finalDir,
                emptyOutDir: false
              }
            });
          }

          // Now run Astro's normal build (prerender will have the manifest
          // available via the @qwik-client-manifest virtual module)
          await originalBuildApp(builder);
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
