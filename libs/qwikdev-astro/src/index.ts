import { qwikVite } from "@qwik.dev/core/optimizer";
import type {
  QwikManifest,
  QwikVitePluginOptions,
} from "@qwik.dev/core/optimizer";
import type { RenderOptions } from "@qwik.dev/core/server";
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

        /**
         * Vite 7 removed `options.ssr` from plugin hooks, replacing it with
         * `this.environment`. The qwikVite plugin still relies on `options.ssr`
         * to determine server vs client when resolving `@qwik.dev/core/build`,
         * so it always returns `isBrowser: true` in Vite 7, which causes
         * `document is not defined` errors when preloader.mjs runs on the server.
         *
         * This plugin intercepts `@qwik.dev/core/build` and provides the correct
         * values based on the Vite environment.
         */
        const QWIK_BUILD_ID = "\0@qwik.dev/core/build";
        const QWIK_MANIFEST_ID = "\0@qwik-client-manifest";
        const qwikBuildFixPlugin: PluginOption = {
          name: "astro-qwik-build-fix",
          enforce: "pre",
          resolveId(id) {
            if (id === "@qwik.dev/core/build" || id.endsWith("@qwik.dev/core/build")) {
              return QWIK_BUILD_ID;
            }
            if (id === "@qwik-client-manifest") {
              return QWIK_MANIFEST_ID;
            }
          },
          load(id) {
            if (id === QWIK_BUILD_ID) {
              const isServer =
                this.environment?.name !== "client";
              const isDev =
                this.environment?.mode === "dev" ||
                this.environment?.config?.mode === "development";
              return {
                code: `export const isServer = ${isServer};
export const isBrowser = ${!isServer};
export const isDev = ${isDev};`,
                moduleSideEffects: false
              };
            }
            if (id === QWIK_MANIFEST_ID) {
              // Provide the Qwik manifest from the client build (run before prerender).
              // Falls back to undefined if no client build has run yet.
              const manifestJson = qwikManifest
                ? JSON.stringify(qwikManifest)
                : "undefined";
              return {
                code: `export const manifest = ${manifestJson};`,
                moduleSideEffects: false
              };
            }
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

        const qwikPlugins = qwikVite(qwikSetupConfig);

        // In build mode, strip qwikVite's outputOptions hook — the standalone
        // Qwik client build handles client output. Keep config hook (configResolved
        // depends on state it sets) but undo its output dir changes via post plugin.
        if (!isDev) {
          for (const plugin of qwikPlugins) {
            if (!plugin || typeof plugin !== "object") continue;
            delete (plugin as any).outputOptions;
          }
        }

        const astroQwikPostPlugin: PluginOption = {
          name: "astro-qwik-post",
          enforce: "post" as const,
          config(config) {
            config.esbuild = {};
            if (!isDev) {
              // Undo qwikVite's output dir overrides so Astro controls per-environment dirs
              delete config.build?.outDir;
              if (config.build?.rollupOptions?.output) {
                const output = config.build.rollupOptions.output;
                if (Array.isArray(output)) {
                  for (const o of output) if (o && typeof o === "object") delete o.dir;
                } else if (typeof output === "object") {
                  delete output.dir;
                }
              }
            }
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
        const originalBuildApp = (vite as any).builder?.buildApp;
        if (!originalBuildApp) return;

        (vite as any).builder.buildApp = async (builder: any) => {
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
      name,
      hooks: lifecycleHooks,
      plugins: [aikMod]
    });
  }
});

function getRelativePath(from: string, to: string) {
  return to.replace(from, "") || ".";
}

async function scanQwikEntrypoints(
  config: AstroConfig,
  filter: (id: string) => boolean,
  debug?: boolean
): Promise<Set<string>> {
  const { execSync } = await import("node:child_process");
  const { resolve } = await import("node:path");
  const srcDir = config.srcDir.pathname;

  const matches = execSync(
    `grep -rl --include='*.tsx' --include='*.jsx' --include='*.ts' --include='*.js' -E '@builder\\.io/qwik|qwik\\.dev/(core|react)' .`,
    { cwd: srcDir, encoding: "utf-8", stdio: ["pipe", "pipe", "ignore"] }
  ).trim();

  if (!matches) return new Set();

  const entrypoints = new Set<string>();
  for (const rel of matches.split("\n")) {
    const abs = resolve(srcDir, rel);
    if (!filter(abs)) continue;
    entrypoints.add(abs);
    if (debug) console.debug(`[qwikdev/astro] Found Qwik entrypoint: ${abs}`);
  }

  return entrypoints;
}

