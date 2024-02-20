import type { AstroConfig } from "astro";
import { z } from "astro/zod";

/** 
 this project uses astro integration kit. refer to the docs here: https://astro-integration-kit.netlify.app/ 
*/
import { createResolver, defineIntegration } from "astro-integration-kit";
import { watchIntegrationPlugin } from "astro-integration-kit/plugins";

// vite
import { build, createFilter, type InlineConfig } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";
import { qwikVite } from "@builder.io/qwik/optimizer";

// node
import { join, normalize, relative } from "node:path";
import { rmSync } from "node:fs";
import os from "os";

// integration files
import { hash, moveArtifacts } from "../utils";
import { getQwikEntrypoints } from "../entrypoints";

/* similar to vite's FilterPattern */
const FilternPatternSchema = z.union([
  z.string(),
  z.instanceof(RegExp),
  z.array(z.union([z.string(), z.instanceof(RegExp)])).readonly(),
  z.null(),
]);

export default defineIntegration({
  name: "@qwikdev/astro",
  plugins: [watchIntegrationPlugin],
  optionsSchema: z.object({
    include: FilternPatternSchema.optional(),
    exclude: FilternPatternSchema.optional(),
  }),
  setup({ options }) {
    let distDir: string = "";
    let srcDir: string = "";
    let tempDir = join("tmp-" + hash());
    let astroConfig: AstroConfig | null = null;
    let entrypoints: Promise<string[]>;
    const filter = createFilter(options.include, options.exclude);

    const { resolve } = createResolver(import.meta.url);

    return {
      "astro:config:setup": async ({
        addRenderer,
        updateConfig,
        config,
        command,
        injectScript,
        watchIntegration,
      }) => {
        // Integration HMR
        watchIntegration(resolve());

        /**
         * Because Astro uses the same port for both dev and preview, we need to unregister the SW in order to avoid a stale SW in dev mode.
         */
        if (command === "dev") {
          const unregisterSW = `navigator.serviceWorker.getRegistration().then((r) => r && r.unregister())`;

          injectScript("head-inline", unregisterSW);
        }

        // Update the global config
        astroConfig = config;
        // Retrieve Qwik files
        // from the project source directory
        srcDir = relative(
          astroConfig.root.pathname,
          astroConfig.srcDir.pathname
        );

        // used in server.ts for dev mode
        process.env.SRC_DIR = relative(
          astroConfig.root.pathname,
          astroConfig.srcDir.pathname
        );

        entrypoints = getQwikEntrypoints(srcDir, filter);
        if ((await entrypoints).length !== 0) {
          addRenderer({
            name: "@qwikdev/astro",
            serverEntrypoint: resolve("../server.ts"),
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
                    inlineDynamicImports: false,
                  },
                },
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
                    /* In order to make a client build, we need to know
                      all of the entry points to the application so
                      that we can generate the manifest. 
                    */
                    input: await entrypoints,
                  },
                  ssr: {
                    input: resolve("../server.ts"),
                  },
                }),
                tsconfigPaths(),
                {
                  // HACK: override qwikVite's attempt to set `esbuild` to false during dev
                  enforce: "post",
                  config(config: any) {
                    config.esbuild = true;
                    return config;
                  },
                },
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
                },
              },
            ],
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

          let normalizedPath = normalize(outputPath);
          process.env.Q_BASE = normalizedPath;

          await moveArtifacts(tempDir, normalizedPath);
          // remove the temp dir folder
          rmSync(tempDir, { recursive: true });
        } else {
          logger.info("Build finished. No artifacts moved.");
        }
      },
    };
  },
});
