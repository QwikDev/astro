import { build, createFilter, type FilterPattern } from "vite";
import { join, relative } from "node:path";
import { createInterface } from "node:readline";
import { qwikVite } from "@builder.io/qwik/optimizer";
import { createReadStream, rmSync } from "node:fs";
import { readdir } from "node:fs/promises";
import { getQwikLoaderScript } from "@builder.io/qwik/server";
import type { AstroConfig, AstroIntegration } from "astro";
import fsExtra from "fs-extra";

export type Options = Partial<{
  include: FilterPattern;
  exclude: FilterPattern;
}>;

export default function createIntegration(
  options: Options = {}
): AstroIntegration {
  let filter = createFilter(options.include, options.exclude);
  let distDir: string = "";
  let entryDir: string = "";
  let astroConfig: AstroConfig | null = null;
  let tempDir = join(distDir, ".tmp-" + hash());
  let entrypoints: Promise<string[]>;

  return {
    name: "@qwikdev/astro",
    hooks: {
      "astro:config:setup": async ({
        addRenderer,
        updateConfig,
        injectScript,
        config,
      }) => {
        // Update the global config
        astroConfig = config;
        // Retrieve Qwik files
        // from the project source directory
        entryDir = relative(
          astroConfig.root.pathname,
          astroConfig.srcDir.pathname
        );

        // used in server.ts for dev mode
        process.env.SRC_DIR = relative(
          astroConfig.root.pathname,
          astroConfig.srcDir.pathname
        );

        entrypoints = getQwikEntrypoints(entryDir, filter);
        if ((await entrypoints).length !== 0) {
          addRenderer({
            name: "@qwikdev/astro",
            serverEntrypoint: "@qwikdev/astro/server",
          });
          // Update the global dist directory relative
          // to the current project directory
          distDir = relative(
            astroConfig.root.pathname,
            astroConfig.outDir.pathname
          );
          // adds qwikLoader once (instead of per container)
          injectScript("head-inline", getQwikLoaderScript());
          updateConfig({
            vite: {
              build: {
                rollupOptions: {
                  output: {
                    inlineDynamicImports: false,
                  },
                },
              },
              outDir: astroConfig.outDir.pathname,
              plugins: [
                qwikVite({
                  devSsrServer: false,
                  entryStrategy: {
                    type: "smart",
                  },
                  srcDir: entryDir,
                  client: {
                    // In order to make a client build, we need to know
                    // all of the entry points to the application so
                    // that we can generate the manifest.
                    input: await entrypoints,
                    outDir: distDir,
                  },
                  ssr: {
                    input: "@qwikdev/astro/server",
                  },
                }),
              ],
            },
          });
        }
      },
      "astro:config:done": async ({ config }) => {
        astroConfig = config;
      },
      "astro:build:start": async ({ logger }) => {
        logger.info("astro:build:start");
        if ((await entrypoints).length > 0) {
          await build({ ...astroConfig?.vite });
          await moveArtifacts(distDir, tempDir);
        } else {
          logger.info("No entrypoints found. Skipping build.");
        }
      },
      "astro:build:done": async ({ logger }) => {
        if ((await entrypoints).length > 0 && astroConfig) {
          await moveArtifacts(
            tempDir,
            astroConfig.output === "server"
              ? astroConfig.build.client.pathname
              : astroConfig.outDir.pathname
          );
          // remove the temp dir folder
          rmSync(tempDir, { recursive: true });
        } else {
          logger.info("Build finished. No artifacts moved.");
        }
      },
    },
  };
}

function hash() {
  return Math.random().toString(26).split(".").pop();
}

async function moveArtifacts(srcDir: string, destDir: string) {
  // Ensure the destination dir exists, create if not
  await fsExtra.ensureDir(destDir);
  for (const file of await readdir(srcDir)) {
    // move files from source to destintation, overwrite if they exist
    await fsExtra.move(join(srcDir, file), join(destDir, file), {
      overwrite: true,
    });
  }
}

async function crawlDirectory(dir: string): Promise<string[]> {
  const entries = await readdir(dir, { withFileTypes: true });

  const files = await Promise.all(
    entries.map((entry) => {
      const fullPath = join(dir, entry.name);
      return entry.isDirectory() ? crawlDirectory(fullPath) : fullPath;
    })
  );

  // flatten files array
  return files.flat();
}

/**
 *
 * We need to find the Qwik entrypoints so that the client build will run successfully.
 *
 */
async function getQwikEntrypoints(
  dir: string,
  filter: (id: unknown) => boolean
): Promise<string[]> {
  const files = await crawlDirectory(dir);
  const qwikFiles = [];

  for (const file of files) {
    // Skip files not matching patterns
    if (!filter(file)) {
      continue;
    }

    const fileStream = createReadStream(file);

    // holds readline interface
    const rl = createInterface({
      input: fileStream,
      crlfDelay: Infinity,
    });

    let importFound = false;
    let builderFound = false;
    let found = false;
    for await (const line of rl) {
      if (line.includes("import")) {
        importFound = true;
      }
      if (line.includes("@builder.io/qwik")) {
        builderFound = true;
      }
      if (importFound && builderFound) {
        qwikFiles.push(file);
        found = true;
        break;
      }
    }

    if (found) {
      rl.close();
      fileStream.close();
    }
  }

  return qwikFiles;
}
