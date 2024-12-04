import { qwikVite, symbolMapper } from "@builder.io/qwik/optimizer";
import type {
  QwikManifest,
  QwikVitePluginOptions,
  SymbolMapperFn
} from "@builder.io/qwik/optimizer";
import type { AstroConfig, AstroIntegration } from "astro";
import { createResolver, defineIntegration, watchDirectory } from "astro-integration-kit";
import { z } from "astro/zod";
import { type PluginOption, build, createFilter } from "vite";

declare global {
  var symbolMapperFn: SymbolMapperFn;
  var hash: string | undefined;
  var relativeClientPath: string;
  var qManifest: QwikManifest;
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
    let clientDir = "";
    let serverDir = "";
    let outDir = "";
    let finalDir = "";

    let resolveEntrypoints: () => void;
    const entrypointsReady = new Promise<void>((resolve) => {
      resolveEntrypoints = resolve;
    });

    const qwikEntrypoints = new Set<string>();
    const potentialEntries = new Set<string>();
    let astroConfig: AstroConfig | null = null;
    const { resolve: resolver } = createResolver(import.meta.url);
    const filter = createFilter(options?.include, options?.exclude);

    const lifecycleHooks: AstroIntegration["hooks"] = {
      "astro:config:setup": async (setupProps) => {
        const { addRenderer, updateConfig, config, command, injectScript } = setupProps;
        astroConfig = config;

        // integration HMR support
        watchDirectory(setupProps, resolver());

        // Because Astro uses the same port for both dev and preview, we need to unregister the SW in order to avoid a stale SW in dev mode.
        if (command === "dev") {
          const unregisterSW =
            "navigator.serviceWorker.getRegistration().then((r) => r && r.unregister())";

          injectScript("head-inline", unregisterSW);
        }

        srcDir = astroConfig.srcDir.pathname;
        clientDir = astroConfig.build.client.pathname;
        serverDir = astroConfig.build.server.pathname;
        outDir = astroConfig.outDir.pathname;

        // check whether it has an adapter instead of output (e.g Node, Netlify, etc.)
        finalDir = astroConfig.output === "static" ? outDir : clientDir;

        console.log("SRC DIR:", srcDir);

        addRenderer({
          name: "@qwikdev/astro",
          serverEntrypoint: resolver("../server.ts")
        });

        /**
         * HACK: Normalize Windows paths by removing drive letter prefix
         * Required because Qwik optimizer and Vite plugin normalize paths differently
         */
        const windowsPathPattern = /^(?:\/)?[A-Z]:[/\\]/i;
        if (windowsPathPattern.test(srcDir)) {
          srcDir = srcDir.substring(3);
          clientDir = clientDir.substring(3);
          serverDir = serverDir.substring(3);
          outDir = outDir.substring(3);
          finalDir = finalDir.substring(3);
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

        const astroQwikPlugin: PluginOption = {
          name: "astro-qwik-parser",
          enforce: "pre",
          configResolved() {
            globalThis.symbolMapperFn = symbolMapper;
          },
          buildEnd() {
            resolveEntrypoints();
          },
          async resolveId(id, importer) {
            // only grab the imports of Astro files
            const isAstroFile =
              importer?.endsWith(".astro") || importer?.endsWith(".mdx");

            if (!isAstroFile) {
              return null;
            }

            const resolved = await this.resolve(id, importer);
            if (!resolved) {
              throw new Error(`Could not resolve ${id} from ${importer}`);
            }

            const isPotentialEntry = /\.(tsx|jsx|ts|js|qwik\.)/.test(resolved.id);
            if (!isPotentialEntry) {
              return null;
            }

            // add Qwik libraries
            if (resolved.id.includes(".qwik.")) {
              qwikEntrypoints.add(resolved.id);
            } else {
              potentialEntries.add(resolved.id);
            }

            return null;
          },
          async transform(code, id) {
            if (!potentialEntries.has(id)) {
              return null;
            }

            /**
             *  Qwik Entrypoints
             *  ---
             *  @builder.io/qwik
             *  @builder.io/qwik-react
             *  @qwik.dev/core
             *  @qwik.dev/react
             */

            // TODO: use parser here (vite gives it)
            const qwikImportsRegex =
              /@builder\.io\/qwik(-react)?|qwik\.dev\/(core|react)/;

            if (qwikImportsRegex.test(code)) {
              qwikEntrypoints.add(id);
            }

            return null;
          }
        };

        const qwikServerConfig: QwikVitePluginOptions = {
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
            plugins: [astroQwikPlugin, qwikVite(qwikServerConfig), overrideEsbuildPlugin]
          }
        });
      },

      "astro:config:done": async ({ config }) => {
        astroConfig = config;
      },

      "astro:build:ssr": async () => {
        await entrypointsReady;

        let qManifest: null | QwikManifest = null;

        // SSR build finished -> Now do the Qwik client build
        const qwikClientConfig: QwikVitePluginOptions = {
          devSsrServer: false,
          srcDir,
          ssr: {
            input: "@qwikdev/astro/server",
            outDir: serverDir
          },
          client: {
            input: [...qwikEntrypoints, resolver("./root.tsx")],
            outDir: finalDir,
            manifestOutput: (manifest) => {
              globalThis.qManifest = manifest;
              qManifest = manifest;
            }
          },
          debug: options?.debug ?? false
        };

        /**
         * Write manifest to disk for server build to access.
         * Required for production/Playwright tests where server
         * build runs in a separate process from client build.
         */
        const manifestWriterPlugin: PluginOption = {
          name: "qwik-manifest-writer",
          generateBundle() {
            if (qManifest) {
              this.emitFile({
                type: "asset",
                fileName: `${finalDir}q-manifest.json`,
                source: JSON.stringify(qManifest, null, 2)
              });
            }
          }
        };

        await build({
          ...astroConfig?.vite,
          plugins: [qwikVite(qwikClientConfig), manifestWriterPlugin],
          build: {
            ...astroConfig?.vite.build,
            ssr: false,
            outDir: finalDir,
            emptyOutDir: false
          }
        });
      }
    };

    return {
      hooks: lifecycleHooks
    };
  }
});
