import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { qwikVite, symbolMapper } from "@builder.io/qwik/optimizer";
import type {
  QwikManifest,
  QwikVitePluginOptions,
  SymbolMapperFn
} from "@builder.io/qwik/optimizer";
import { inlineModule } from "@inox-tools/inline-mod/vite";
import inlineMod from "@inox-tools/inline-mod/vite";
import type { AstroConfig, AstroIntegration } from "astro";
import { createResolver, defineIntegration, watchDirectory } from "astro-integration-kit";
import { z } from "astro/zod";
import { type PluginOption, build, createFilter } from "vite";
import type { InlineConfig } from "vite";

declare global {
  var symbolMapperFn: SymbolMapperFn;
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
      debug: z.boolean().optional(),

      /**
       * Use node's readFileSync to read the manifest. Common for deployment providers that don't support dynamic json imports. When false, please ensure your deployment provider supports dynamic json imports, through environment variables or other means.
       */
      isNode: z.boolean().optional().default(true)
    })
    .optional(),

  setup({ options }) {
    let srcDir = "";
    let clientDir = "";
    let serverDir = "";
    let outDir = "";
    let finalDir = "";
    let astroVite: InlineConfig;

    let resolveEntrypoints: () => void;
    const entrypointsReady = new Promise<void>((resolve) => {
      resolveEntrypoints = resolve;
    });

    const qwikEntrypoints = new Set<string>();
    const potentialEntries = new Set<string>();
    let astroConfig: AstroConfig | null = null;
    const { resolve: resolver } = createResolver(import.meta.url);
    const filter = createFilter(options?.include, options?.exclude);
    let qAstroManifestPath = "";

    const lifecycleHooks: AstroIntegration["hooks"] = {
      "astro:config:setup": async (setupProps) => {
        const { addRenderer, updateConfig, config, command } = setupProps;
        astroConfig = config;

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
        } else {
          finalDir = outDir;
        }

        qAstroManifestPath = resolver(
          join(astroConfig.root.pathname + finalDir, "q-astro-manifest.json")
        );

        // passes config values to other runtimes with a virtual module
        inlineModule({
          constExports: {
            isNode: options?.isNode ?? true,
            qAstroManifestPath
          }
        });

        /* q-astro-manifest.json doesn't error in dev */
        if (command === "dev") {
          writeFileSync(qAstroManifestPath, "{}", "utf-8");
        }

        // integration HMR support
        watchDirectory(setupProps, resolver());

        addRenderer({
          name: "@qwikdev/astro",
          serverEntrypoint: resolver("../server.ts")
        });

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
              inlineMod(),
              astroQwikPlugin,
              qwikVite(qwikSetupConfig),
              overrideEsbuildPlugin
            ]
          }
        });
      },

      "astro:config:done": async ({ config }) => {
        astroConfig = config;
      },

      "astro:build:setup": async ({ vite }) => {
        astroVite = vite as InlineConfig;
      },

      "astro:build:ssr": async () => {
        await entrypointsReady;

        // Astro's SSR build finished -> Now we can handle how Qwik normally builds
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
              writeFileSync(qAstroManifestPath, JSON.stringify(manifest), "utf-8");
            }
          },
          debug: options?.debug ?? false
        };

        // determine which plugins from core to keep
        const astroPlugins = (
          astroVite.plugins?.flatMap((p) => (Array.isArray(p) ? p : [p])) ?? []
        )
          .filter((plugin): plugin is { name: string } & NonNullable<PluginOption> => {
            return plugin != null && typeof plugin === "object" && "name" in plugin;
          })
          .filter((plugin) => {
            const isCoreBuildPlugin = plugin.name === "astro:build";
            const isAstroInternalPlugin = plugin.name.includes("@astro");
            const isAllowedPlugin =
              plugin.name === "astro:transitions" || plugin.name.includes("virtual");
            const isAstroBuildPlugin = plugin.name.startsWith("astro:build");
            const isQwikPlugin =
              plugin.name === "vite-plugin-qwik" ||
              plugin.name === "vite-plugin-qwik-post" ||
              plugin.name === "overrideEsbuild";

            if (isAllowedPlugin) {
              return true;
            }

            return !(
              isCoreBuildPlugin ||
              isAstroInternalPlugin ||
              isAstroBuildPlugin ||
              isQwikPlugin
            );
          });

        await build({
          ...astroConfig?.vite,
          plugins: [...astroPlugins, qwikVite(qwikClientConfig)],
          build: {
            ...astroConfig?.vite?.build,
            ssr: false,
            outDir: finalDir,
            emptyOutDir: false
          }
        } as InlineConfig);
      }
    };

    return {
      hooks: lifecycleHooks
    };
  }
});

function getRelativePath(from: string, to: string) {
  return to.replace(from, "") || ".";
}
