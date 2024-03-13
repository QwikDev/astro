import fs from "node:fs";
import os from "node:os";
import fsExtra from "fs-extra";
import move from "fs-move";

import { rmSync } from "node:fs";
import { lstat, readdir, readlink } from "node:fs/promises";
import { dirname, join, normalize, relative, resolve } from "node:path";

import type { AstroConfig } from "astro";
import { z } from "astro/zod";
import ts from "typescript";

import { qwikVite } from "@builder.io/qwik/optimizer";
import { createResolver, defineIntegration } from "astro-integration-kit";
import { watchIntegrationPlugin } from "astro-integration-kit/plugins";

import { type InlineConfig, build, createFilter } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";

/* Similar to vite's FilterPattern */
const FilternPatternSchema = z.union([
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
  plugins: [watchIntegrationPlugin],
  optionsSchema: z.object({
    include: FilternPatternSchema.optional(),
    exclude: FilternPatternSchema.optional()
  }),

  setup({ options }) {
    let distDir = "";
    let srcDir = "";
    let astroConfig: AstroConfig | null = null;
    let entrypoints: Promise<string[]>;

    const tempDir = join(`tmp-${hash()}`);
    const filter = createFilter(options.include, options.exclude);
    const { resolve } = createResolver(import.meta.url);

    return {
      "astro:config:setup": async ({
        addRenderer,
        updateConfig,
        config,
        command,
        injectScript,
        watchIntegration
      }) => {
        // Integration HMR
        watchIntegration(resolve());

        // Because Astro uses the same port for both dev and preview, we need to unregister the SW in order to avoid a stale SW in dev mode.
        if (command === "dev") {
          const unregisterSW =
            "navigator.serviceWorker.getRegistration().then((r) => r && r.unregister())";

          injectScript("head-inline", unregisterSW);
        }

        // Update the global config
        astroConfig = config;
        // Retrieve Qwik files from the project source directory
        srcDir = relative(astroConfig.root.pathname, astroConfig.srcDir.pathname);

        // used in server.ts for dev mode
        process.env.SRC_DIR = relative(
          astroConfig.root.pathname,
          astroConfig.srcDir.pathname
        );

        entrypoints = getQwikEntrypoints(srcDir, filter);

        if ((await entrypoints).length !== 0) {
          addRenderer({
            name: "@qwikdev/astro",
            serverEntrypoint: resolve("../server.ts")
          });

          // Update the global dist directory
          distDir = astroConfig.outDir.pathname;

          // checks all windows platforms and removes drive ex: C:\\
          if (os.platform() === "win32") {
            distDir = distDir.substring(3);
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
                qwikVite({
                  /* user passed include & exclude config (to use multiple JSX frameworks) */
                  fileFilter: (id: string, hook: string) => {
                    if (hook === "transform" && !filter(id)) {
                      return false;
                    }

                    return true;
                  },
                  devSsrServer: false,
                  srcDir,
                  client: {
                    /* 
                      In order to make a client build, we need to know
                      all of the entry points to the application so
                      that we can generate the manifest. 
                    */
                    input: await entrypoints
                  },
                  ssr: {
                    input: resolve("../server.ts")
                  }
                }),
                tsconfigPaths(),
                {
                  // HACK: override qwikVite's attempt to set `esbuild` to false during dev
                  enforce: "post",
                  config(config) {
                    // @ts-expect-error - true is assigned, but it's not a valid value, this should be reviewed.
                    config.esbuild = true;
                    return config;
                  }
                }
              ]
            }
          });
        }
      },

      "astro:config:done": async ({ config }) => {
        astroConfig = config;
      },

      "astro:build:start": async ({ logger }) => {
        logger.info("astro:build:start");

        if ((await entrypoints).length > 0) {
          // make sure vite does not parse .astro files
          await build({
            ...astroConfig?.vite,
            plugins: [
              ...(astroConfig?.vite.plugins || []),
              {
                enforce: "pre",
                name: "astro-noop",

                load(id) {
                  if (id.endsWith(".astro")) {
                    return "export default function() {}";
                  }
                  return null;
                }
              }
            ]
          } as InlineConfig);

          await moveArtifacts(distDir, tempDir);
        } else {
          logger.info("No entrypoints found. Skipping build.");
        }
      },

      "astro:build:done": async ({ logger }) => {
        if ((await entrypoints).length > 0 && astroConfig) {
          let outputPath =
            astroConfig.output === "server" || astroConfig.output === "hybrid"
              ? astroConfig.build.client.pathname
              : astroConfig.outDir.pathname;

          // checks all windows platforms and removes drive ex: C:\\
          if (os.platform() === "win32") {
            outputPath = outputPath.substring(3);
          }

          const normalizedPath = normalize(outputPath);
          process.env.Q_BASE = normalizedPath;

          await moveArtifacts(tempDir, normalizedPath);
          // remove the temp dir folder
          rmSync(tempDir, { recursive: true });
        } else {
          logger.info("Build finished. No artifacts moved.");
        }
      }
    };
  }
});

/** We need to find the Qwik entrypoints so that the client build will run successfully. */
export async function getQwikEntrypoints(
  dir: string,
  filter: (id: unknown) => boolean
): Promise<string[]> {
  const files = await crawlDirectory(dir);
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

export function hash() {
  return Math.random().toString(26).split(".").pop();
}

export async function moveArtifacts(srcDir: string, destDir: string) {
  // Ensure the destination dir exists, create if not
  await fsExtra.ensureDir(destDir);

  for (const file of await readdir(srcDir)) {
    // move files from source to destintation, overwrite if they exist
    await move(join(srcDir, file), join(destDir, file), {
      // Merge directories
      merge: true,
      // Don't overwrite any files, as this would overwrite astro-generated files with files from public.
      // This matches astro's default behavior of replacing files in public with generated pages on naming-conflicts.
      overwrite: false
    });
  }
}

export async function crawlDirectory(dir: string): Promise<string[]> {
  /**
   * Recursively follows a symlink.
   *
   * @param path symlink to follow
   * @returns `[target, stat]` where `target` is the final target path and `stat` is the {@link fs.Stats} of the target or `undefined` if the target does not exist.
   */
  const readLinkRec = async (path: string): Promise<[string, fs.Stats | undefined]> => {
    const target = resolve(dirname(path), await readlink(path));
    const stat = await lstat(target).catch((e) => {
      if (e.code === "ENOENT") {
        return undefined;
      }

      throw e;
    });

    if (stat?.isSymbolicLink()) {
      return readLinkRec(target);
    }

    return [target, stat];
  };

  /**
   * Recurse on the passed directory. Follows symlinks and stops when a loop is detected (i.e., `dir` has already been visited)
   *
   * @param dir The current directory to recursively list
   * @param visitedDirs Directories that have already been visited
   * @returns A recursive list of files in the passed directory
   */
  const crawl = async (dir: string, visitedDirs: string[]): Promise<string[]> => {
    if (visitedDirs.includes(dir)) {
      return [];
    }

    visitedDirs.push(dir);
    const entries = await readdir(dir, { withFileTypes: true });

    const files = await Promise.all(
      entries.map((entry) => {
        const fullPath = join(dir, entry.name);

        if (entry.isSymbolicLink()) {
          return readLinkRec(fullPath).then(
            ([target, stat]): string | string[] | Promise<string[]> => {
              if (stat === undefined) {
                return []; // target does not exist
              }

              return stat.isDirectory() ? crawl(target, visitedDirs) : target;
            }
          );
        }

        return entry.isDirectory() ? crawl(fullPath, visitedDirs) : fullPath;
      })
    );

    // flatten files array
    return files.flat();
  };

  // Absolute path for duplicate-detection
  const absoluteDir = resolve(dir);
  return crawl(absoluteDir, []);
}
