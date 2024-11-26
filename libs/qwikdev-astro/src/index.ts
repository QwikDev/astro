import fs from "node:fs";
import os from "node:os";
import { tmpdir } from "node:os";
import { join, normalize } from "node:path";

import type { AstroConfig, AstroIntegration } from "astro";
import { createResolver, defineIntegration, watchDirectory } from "astro-integration-kit";
import { z } from "astro/zod";
import fg from "fast-glob";
import ts from "typescript";

import { qwikVite } from "@builder.io/qwik/optimizer";
import type { QwikVitePluginOptions, SymbolMapperFn } from "@builder.io/qwik/optimizer";
import { symbolMapper } from "@builder.io/qwik/optimizer";

import fsExtra from "fs-extra";
import { build, createFilter } from "vite";
import type { PluginOption } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";

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
    const srcDir = "";
    let astroConfig: AstroConfig | null = null;
    let entrypoints: Promise<string[]>;
    // Create temp dir in system temp directory
    const tempDir = join(tmpdir(), `qwik-astro-${newHash()}`);
    const filter = createFilter(options?.include, options?.exclude);

    const { resolve: resolver } = createResolver(import.meta.url);

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

        entrypoints = getQwikEntrypoints(astroConfig.srcDir.pathname, filter);

        console.log("ENTRYPOINTS: ", await entrypoints);

        addRenderer({
          name: "@qwikdev/astro",
          serverEntrypoint: "@qwikdev/astro/server"
        });

        /** We need to get the symbolMapper straight from qwikVite here. You can think of it as the "manifest" for dev mode. */
        const symbolMapperPlugin: PluginOption = {
          name: "grabSymbolMapper",
          configResolved() {
            globalThis.symbolMapperFn = symbolMapper;
          }
        };

        /** check if the file should be processed based on the 'transform' hook and user-defined filters (include & exclude) */
        const fileFilter = (id: string, hook: string) => {
          if (hook === "transform" && !filter(id)) {
            return false;
          }

          return true;
        };

        const qwikViteConfig: QwikVitePluginOptions = {
          fileFilter,
          devSsrServer: false,
          srcDir,
          ssr: {
            input: "@qwikdev/astro/server"
          },
          client: {
            input: await entrypoints
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
      },

      "astro:config:done": async ({ config }) => {
        astroConfig = config;
      },

      "astro:build:start": async () => {
        if ((await entrypoints).length === 0) {
          return;
        }

        await fsExtra.ensureDir(tempDir);

        await build({
          plugins: [...(astroConfig?.vite.plugins || [])],
          build: {
            ...astroConfig?.vite.build,
            ssr: false,
            outDir: tempDir
          }
        });
      },

      "astro:build:done": async () => {
        let outputPath =
          astroConfig.output === "server" || astroConfig.output === "hybrid"
            ? astroConfig.build.client.pathname
            : astroConfig.outDir.pathname;

        if (os.platform() === "win32") {
          outputPath = outputPath.substring(3);
        }

        const normalizedPath = normalize(outputPath);
        process.env.Q_BASE = normalizedPath;

        try {
          if ((await entrypoints).length > 0 && astroConfig) {
            // Copy files from temp to final destination
            await fsExtra.copy(tempDir, astroConfig.outDir.pathname, {
              overwrite: false, // Don't overwrite existing files
              errorOnExist: false // Don't error if files exist
            });
          }
        } finally {
          // Always clean up temp directory
          await fsExtra.remove(tempDir).catch(() => {});
        }
      }
    };

    return {
      hooks: lifecycleHooks
    };
  }
});

export async function getQwikEntrypoints(
  dir: string,
  filter: (id: unknown) => boolean
): Promise<string[]> {
  const files = await fg(["**/*.{ts,tsx,js,jsx}"], {
    cwd: dir,
    absolute: true
  });
  const qwikFiles = [];

  for (const file of files) {
    // Skip files not matching patterns w/ astro config include & exclude
    if (!filter(file)) {
      continue;
    }

    const fileContent = fs.readFileSync(file, "utf-8");
    const sourceFile = ts.createSourceFile(
      file,
      fileContent,
      ts.ScriptTarget.ESNext,
      true
    );

    let qwikImportFound = false;

    ts.forEachChild(sourceFile, function nodeVisitor(node) {
      if (ts.isImportDeclaration(node) && ts.isStringLiteral(node.moduleSpecifier)) {
        if (
          node.moduleSpecifier.text === "@builder.io/qwik" ||
          node.moduleSpecifier.text === "@builder.io/qwik-react"
        ) {
          qwikImportFound = true;
        }
      }

      if (!qwikImportFound) {
        ts.forEachChild(node, nodeVisitor);
      }
    });

    if (qwikImportFound) {
      qwikFiles.push(file);
    }
  }

  return qwikFiles;
}

export function newHash() {
  const hash = Math.random().toString(26).split(".").pop();
  globalThis.hash = hash;
  return hash;
}
