import { qwikVite } from "@qwik.dev/core/optimizer";
import type { QwikManifest, QwikVitePluginOptions } from "@qwik.dev/core/optimizer";
import { type PluginOption, build } from "vite";
import { SERVER_ENTRYPOINT, VIRTUAL_MODULES } from "./constants";

/** Intercepts `@qwik-client-manifest` to provide the manifest from our standalone Qwik client build. */
export function createQwikManifestPlugin(
  getManifest: () => QwikManifest | null
): PluginOption {
  const VIRTUAL_ID = VIRTUAL_MODULES["@qwik-client-manifest"];

  return {
    name: "astro-qwik-manifest",
    enforce: "pre",
    resolveId(id) {
      if (id === "@qwik-client-manifest") return VIRTUAL_ID;
      return undefined;
    },
    load(id) {
      if (id !== VIRTUAL_ID) return undefined;
      const manifest = getManifest();
      return {
        code: `export const manifest = ${manifest ? JSON.stringify(manifest) : "undefined"};`,
        moduleSideEffects: false
      };
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
