import { qwikVite, symbolMapper } from "@builder.io/qwik/optimizer";
import type { QwikVitePluginOptions, SymbolMapperFn } from "@builder.io/qwik/optimizer";
import type { AstroConfig, AstroIntegration } from "astro";
import { createResolver, defineIntegration, watchDirectory } from "astro-integration-kit";
import { z } from "astro/zod";
import { type PluginOption, build, createFilter } from "vite";

declare global {
  var symbolMapperFn: SymbolMapperFn;
  var hash: string | undefined;
  var relativeClientPath: string;
  var qManifest: any;
  var isStatic: boolean;
}

/* Similar to vite's FilterPattern */
const FilterPatternSchema = z.union([
  z.string(),
  z.instanceof(RegExp),
  z.array(z.union([z.string(), z.instanceof(RegExp)])).readonly(),
  z.null()
]);

const qwikEntrypoints = new Set<string>();
let resolveEntrypoints: () => void;
const entrypointsReady = new Promise<void>((resolve) => {
  resolveEntrypoints = resolve;
});

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

        console.log("SRC DIR:", srcDir)

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
        }

        /** check if the file should be processed based on the 'transform' hook and user-defined filters (include & exclude) */
        const fileFilter = (id: string, hook: string) => {
          if (hook === "transform" && !filter(id)) {
            return false;
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
            // Signal that we're done collecting entrypoints
            resolveEntrypoints();
          },
          async resolveId(id, importer) {
            if (!importer?.endsWith(".astro")) {
              return null;
            }

            const resolved = await this.resolve(id, importer);

            if (!resolved) {
              throw new Error(`Could not resolve ${id} from ${importer}`);
            }

            console.log("RESOLVED ID:", resolved.id);

            // Only add non-astro files to entrypoints
            if (resolved.id.includes(".tsx")) {
              qwikEntrypoints.add(resolved.id);
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
            outDir: clientDir
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
        // renderToStream needs the relative client path for q-chunks
        const base = clientDir.replace(outDir, "");
        globalThis.relativeClientPath =
          astroConfig.output === "static" ? `${base}build/` : "build/";
      },

      "astro:build:ssr": async () => {
        // Wait for entrypoint collection to complete
        await entrypointsReady;

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
            outDir: clientDir
          },
          debug: options?.debug ?? false
        };

        const clientBuild = await build({
          ...astroConfig?.vite,
          plugins: [qwikVite(qwikClientConfig)],
          build: {
            ...astroConfig?.vite.build,
            ssr: false,
            outDir: clientDir,
            emptyOutDir: false
          }
        });

        const qManifest = (
          clientBuild as { output: Array<{ fileName: string; source: string }> }
        ).output.find((output) => output.fileName === "q-manifest.json");

        if (!qManifest) {
          throw new Error("Could not find q-manifest.json");
        }

        globalThis.qManifest = JSON.parse(qManifest.source);
      }
    };

    return {
      hooks: lifecycleHooks
    };
  }
});
