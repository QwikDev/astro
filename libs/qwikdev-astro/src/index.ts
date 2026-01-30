import fs from "node:fs";
import { join } from "node:path";
import { qwikVite, symbolMapper } from "@builder.io/qwik/optimizer";
import type {
  QwikManifest,
  QwikVitePluginOptions,
  SymbolMapperFn
} from "@builder.io/qwik/optimizer";
import type { RenderOptions } from "@builder.io/qwik/server";
import aikMod from "@inox-tools/aik-mod";
import type { AstroConfig, AstroIntegration } from "astro";
import {
  createResolver,
  defineIntegration,
  watchDirectory,
  withPlugins
} from "astro-integration-kit";
import { z } from "astro/zod";
import { type PluginOption, build, createFilter } from "vite";
import type { InlineConfig } from "vite";

// TODO: contributing this back to aik-mod where we export the type
type DefineModuleOptions = {
  constExports?: Record<string, unknown>;
  defaultExport?: unknown;
};

type SetupPropsWithAikMod = Parameters<
  NonNullable<AstroIntegration["hooks"]["astro:config:setup"]>
>[0] & {
  defineModule: (name: string, options: DefineModuleOptions) => string;
};

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

const name = "@qwikdev/astro";

/**
 * This project uses Astro Integration Kit.
 * @see https://astro-integration-kit.netlify.app/
 */
export default defineIntegration({
  name,
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
       * Options passed into each Qwik component's `renderToStream` call.
       */
      renderOpts: z
        .custom<RenderOptions>((data) => {
          return typeof data === "object" && data !== null;
        })
        .optional()
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

    const lifecycleHooks: AstroIntegration["hooks"] = {
      "astro:config:setup": async (setupProps) => {
        const { addRenderer, updateConfig, config, defineModule } =
          setupProps as SetupPropsWithAikMod;
        astroConfig = config;
        // integration HMR support
        watchDirectory(setupProps, resolver());
        addRenderer({
          name: "@qwikdev/astro",
          serverEntrypoint: resolver("../server.ts")
        });

        defineModule("virtual:qwikdev-astro", {
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
            const isFromAstro =
              importer?.endsWith(".astro") || importer?.endsWith(".mdx");
            const isFromTrackedFile = potentialEntries.has(importer ?? "");

            if (!(isFromAstro || isFromTrackedFile)) {
              return null;
            }

            const resolved = await this.resolve(id, importer);
            if (!resolved) {
              if (options?.debug) {
                console.debug(`Could not resolve ${id} from ${importer}`);
              }
              return null;
            }

            if (resolved.id.includes(".qwik.")) {
              qwikEntrypoints.add(resolved.id);
              return null;
            }

            potentialEntries.add(resolved.id);
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
            // manifestInput: "qwik replace me!" as unknown as QwikManifest
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
            plugins: [astroQwikPlugin, qwikVite(qwikSetupConfig), overrideEsbuildPlugin]
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
              const serverChunksDir = astroConfig?.adapter
                ? join(serverDir, "chunks")
                : join(finalDir, "chunks");

              if (!fs.existsSync(serverChunksDir)) {
                fs.mkdirSync(serverChunksDir, { recursive: true });
              }
              const files = fs.readdirSync(serverChunksDir);

              // Astro actions can add more server files
              const serverFiles = files.filter(
                (f) => f.startsWith("server_") && f.endsWith(".mjs")
              );

              for (const serverFile of serverFiles) {
                const serverPath = join(serverChunksDir, serverFile);
                const content = fs.readFileSync(serverPath, "utf-8");

                // Replace the manifest handling in the bundled code
                const manifestJson = JSON.stringify(manifest);
                const newContent = content.replace(
                  "serverData: props,",
                  `serverData: props, manifest: ${manifestJson},`
                );

                fs.writeFileSync(serverPath, newContent);
              }
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

    return withPlugins({
      name,
      hooks: lifecycleHooks,
      plugins: [aikMod]
    });
  }
});

function getRelativePath(from: string, to: string) {
  return to.replace(from, "") || ".";
}
