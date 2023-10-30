import { qwikVite } from "@builder.io/qwik/optimizer";
import type { AstroConfig, AstroIntegration } from "astro";
import { mkdir, readdir, rename } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { build } from "vite";
import inspect from "vite-plugin-inspect";
import { getQwikLoaderScript } from "@builder.io/qwik/server";

export default function createIntegration(): AstroIntegration {
  let astroConfig: AstroConfig | null = null;
  let distDir: string = "";
  let tempDir = join(tmpdir(), "qwik-" + hash());
  let entrypoints = getQwikEntrypoints("./src");

  return {
    name: "@astrojs/qwik",
    hooks: {
      "astro:server:setup": async () => {
        console.log("astro:server:setup");
      },
      "astro:config:done": async ({ config, setAdapter, logger }) => {
        console.log("astro:config:done", config);
        astroConfig = config;
        distDir = join(config.root.pathname, "dist");
      },
      "astro:build:start": async ({ logger }) => {
        logger.info("astro:build:start");
        console.log("astro:build:start");
        await build({ ...astroConfig.vite });
        await moveArtifacts(distDir, tempDir);
      },
      "astro:build:done": async ({ logger }) => {
        debugger;
        await moveArtifacts(
          tempDir,
          join(distDir, astroConfig.output === "server" ? "client" : ".")
        );
        console.log("astro:build:done");
      },
      "astro:config:setup": async ({
        addRenderer,
        updateConfig,
        injectScript,
      }) => {
        console.log("astro:config:setup");

        addRenderer({
          name: "@astrojs/qwik",
          serverEntrypoint: "@astrojs/qwik/server",
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
                  input: "@astrojs/qwik/server",
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
    console.log("Moving file:", join(srcDir, file), "->", join(destDir, file));
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

async function getQwikEntrypoints(dir: string): Promise<string[]> {
  const files = await crawlDirectory(dir);
  return files.filter((file) => file.endsWith(".tsx"));
}
