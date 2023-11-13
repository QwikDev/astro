import { build } from "vite";
import { join, relative } from "node:path";
import { createInterface } from "node:readline";
import { qwikVite } from "@builder.io/qwik/optimizer";
import {
  createReadStream,
  existsSync,
  rmSync,
  statSync,
  unlinkSync,
} from "node:fs";
import { mkdir, readdir, rename } from "node:fs/promises";
import { getQwikLoaderScript } from "@builder.io/qwik/server";

import type { AstroConfig, AstroIntegration } from "astro";

export default function createIntegration(): AstroIntegration {
  let distDir: string = "";
  let entryDir: string = "";
  let astroConfig: AstroConfig | null = null;
  let tempDir = getUniqueTempDir(distDir);
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
        entrypoints = getQwikEntrypoints(entryDir);
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
  await mkdir(destDir, { recursive: true });
  for (const file of await readdir(srcDir)) {
    let destPath = join(destDir, file);
    if (existsSync(destPath)) {
      if (statSync(destPath).isDirectory()) {
        destPath = getUniqueTempDir(destPath);
        await mkdir(destPath);
      } else {
        unlinkSync(destPath);
      }
    }
    await rename(join(srcDir, file), destPath);
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
async function getQwikEntrypoints(dir: string): Promise<string[]> {
  const files = await crawlDirectory(dir);
  const qwikFiles = [];

  for (const file of files) {
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

function getUniqueTempDir(baseDir: string): string {
  let i = 0;
  let tempDir;
  do {
    tempDir = join(baseDir, `.local-${hash()}-${i}`);
    i++;
  } while (existsSync(tempDir));
  return tempDir;
}
