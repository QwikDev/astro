import { qwikVite } from "@qwik.dev/core/optimizer";
import type { QwikManifest, QwikVitePluginOptions } from "@qwik.dev/core/optimizer";
import { build, type PluginOption } from "vite";
import { SERVER_ENTRYPOINT, VIRTUAL_MODULES } from "./constants";

type VirtualId = (typeof VIRTUAL_MODULES)[keyof typeof VIRTUAL_MODULES];

/** Intercepts `@qwik.dev/core/build` and `@qwik-client-manifest` to provide correct isServer/isBrowser/isDev values using Vite 7's `this.environment` (replaces the removed `options.ssr`). TODO: remove this once Qwik supports Environment API */
export function createQwikBuildFixPlugin(
  getManifest: () => QwikManifest | null
): PluginOption {
  const loaders: Record<VirtualId, (ctx: { environment?: any }) => { code: string; moduleSideEffects: boolean }> = {
    [VIRTUAL_MODULES["@qwik.dev/core/build"]](ctx) {
      const isServer = ctx.environment?.name !== "client";
      const isDev = ctx.environment?.mode === "dev" ||
        ctx.environment?.config?.mode === "development";
      return {
        code: `export const isServer = ${isServer};\nexport const isBrowser = ${!isServer};\nexport const isDev = ${isDev};`,
        moduleSideEffects: false
      };
    },
    [VIRTUAL_MODULES["@qwik-client-manifest"]]() {
      const manifest = getManifest();
      return {
        code: `export const manifest = ${manifest ? JSON.stringify(manifest) : "undefined"};`,
        moduleSideEffects: false
      };
    }
  };

  return {
    name: "astro-qwik-build-fix",
    enforce: "pre",
    resolveId(id) {
      if (id in VIRTUAL_MODULES) return VIRTUAL_MODULES[id as keyof typeof VIRTUAL_MODULES];
      if (id.endsWith("@qwik.dev/core/build")) return VIRTUAL_MODULES["@qwik.dev/core/build"];
      return undefined;
    },
    load(id) {
      return loaders[id as VirtualId]?.(this);
    }
  };
}

/** Strips qwikVite's outputOptions hook so the standalone Qwik client build handles client output instead. */
export function stripOutputOptions(plugins: PluginOption[]) {
  for (const plugin of plugins) {
    if (plugin && typeof plugin === "object" && "outputOptions" in plugin) {
      delete plugin.outputOptions;
    }
  }
}

/** Runs a standalone Qwik client build to generate the manifest before Astro's prerender. */
export async function runQwikClientBuild(opts: {
  entrypoints: Set<string>;
  rootEntry: string;
  srcDir: string;
  serverDir: string;
  finalDir: string;
  debug: boolean;
  onManifest: (manifest: QwikManifest) => void;
}) {
  const config: QwikVitePluginOptions = {
    devSsrServer: false,
    srcDir: opts.srcDir,
    ssr: {
      input: SERVER_ENTRYPOINT,
      outDir: opts.serverDir
    },
    client: {
      input: [...opts.entrypoints, opts.rootEntry],
      outDir: opts.finalDir,
      manifestOutput: opts.onManifest
    },
    debug: opts.debug
  };

  await build({
    plugins: [qwikVite(config)],
    build: {
      ssr: false,
      outDir: opts.finalDir,
      emptyOutDir: false
    }
  });
}

/** Undoes qwikVite's output dir overrides so Astro controls per-environment output directories. */
export function createAstroQwikPostPlugin(isDev: boolean): PluginOption {
  return {
    name: "astro-qwik-post",
    enforce: "post" as const,
    config(config) {
      config.esbuild = {};
      if (isDev) return config;

      delete config.build?.outDir;

      const output = config.build?.rollupOptions?.output;
      if (!output) return config;

      if (Array.isArray(output)) {
        for (const o of output) if (o && typeof o === "object") delete o.dir;
      } else if (typeof output === "object") {
        delete output.dir;
      }

      return config;
    }
  };
}
