import { qwikVite } from "@builder.io/qwik/optimizer";
import { getQwikLoaderScript } from "@builder.io/qwik/server";

import { build } from "vite";
import inspect from "vite-plugin-inspect";
import { fileURLToPath } from "node:url";

import { mkdir, readdir, rename } from "node:fs/promises";
import { tmpdir } from "node:os";
import { createReadStream } from "node:fs";
import { createInterface } from "node:readline";
import { join } from "node:path";

import type { AstroConfig, AstroIntegration } from "astro";

export default function createIntegration(): AstroIntegration {
  let astroConfig: AstroConfig | null = null;
  let distDir: string = "";
  let tempDir = join(tmpdir(), "qwik-" + hash());
  let entrypoints = getQwikEntrypoints("./src");

  return {
    name: "astro-qwik",
    hooks: {
      "astro:config:done": async ({ config }) => {
        astroConfig = config;
        distDir = join(config.root.pathname, "dist");
      },
      "astro:build:start": async ({ logger }) => {
        logger.info("astro:build:start");
        await build({ ...astroConfig?.vite });
        await moveArtifacts(distDir, tempDir);
      },
      "astro:build:done": async () => {
        await moveArtifacts(
          tempDir,
          join(distDir, astroConfig?.output === "server" ? "client" : ".")
        );
      },
      "astro:config:setup": async ({
        addRenderer,
        updateConfig,
        injectScript,
      }) => {
        addRenderer({
          name: "astro-qwik",
          serverEntrypoint: fileURLToPath(
            new URL("../../dist/server.js", import.meta.url)
          ),
        });

        injectScript("head-inline", getQwikLoaderScript());

        updateConfig({
          vite: {
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
                },
                ssr: {
                  input: fileURLToPath(
                    new URL("../../dist/server.js", import.meta.url)
                  ),
                },
              }),
              inspect({ build: true }),
            ],
          },
        });
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
    await rename(join(srcDir, file), join(destDir, file));
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

    let found = false;
    for await (const line of rl) {
      if (line.includes("import") && line.includes("@builder.io/qwik")) {
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
