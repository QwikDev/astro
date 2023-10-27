import { qwikVite } from "@builder.io/qwik/optimizer";
import type { AstroIntegration, ViteUserConfig } from "astro";
import { mkdir, readdir, rename } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { build } from "vite";
import inspect from "vite-plugin-inspect";

export default function createIntegration(): AstroIntegration {
  let viteConfig: ViteUserConfig | null = null;
  let distDir: string = "";
  let tempDir = join(tmpdir(), "qwik-" + hash());
  return {
    name: "@astrojs/qwik",
    hooks: {
      "astro:server:setup": async () => {
        console.log("astro:server:setup");
      },
      "astro:config:done": async ({ config, setAdapter, logger }) => {
        console.log("astro:config:done", config);
        viteConfig = config.vite;
        distDir = join(config.root.pathname, "dist");
      },
      "astro:build:start": async ({ logger }) => {
        logger.info("astro:build:start");
        console.log("astro:build:start");
        await build({ ...viteConfig });
        await moveArtifacts(distDir, tempDir);
        debugger;
      },
      "astro:build:done": async ({ logger }) => {
        debugger;
        await moveArtifacts(tempDir, distDir);
        console.log("astro:build:done");
      },
      "astro:config:setup": async ({ addRenderer, updateConfig }) => {
        console.log("astro:config:setup");

        addRenderer({
          name: "@astrojs/qwik",
          serverEntrypoint: "@astrojs/qwik/server",
        });

        updateConfig({
          vite: {
            plugins: [
              // qwikRollup({
              //   debug: true,
              //   entryStrategy: { type: "hook" },
              //   target: "ssr", // TODO: We should not have to hard code this.
              // }),
              qwikVite({
                devSsrServer: false,
                entryStrategy: {
                  type: "smart",
                },
                client: {
                  // In order to make a client build, we need to know
                  // all of the entry points to the application so
                  // that we can generate the manifest.
                  input: ["./src/components/counter.tsx"],
                },
                ssr: {
                  input: "./src/components/counter.tsx",
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
