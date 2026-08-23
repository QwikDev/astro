import { qwikVite } from "@qwik.dev/core/optimizer";
import type { QwikManifest, QwikVitePluginOptions } from "@qwik.dev/core/optimizer";
import type { InlineConfig, PluginOption } from "vite";
import { build } from "vite";

import { SERVER_ENTRYPOINT } from "./constants";

/**
 * Strips Qwik's client-output hooks from Astro's builds. The standalone Qwik
 * client build owns those outputs; allowing Astro's client environment to emit
 * another manifest overwrites the valid manifest with one that only describes
 * Astro's own client entries.
 */
export function stripClientOutputHooks(plugins: PluginOption[]) {
  for (const plugin of plugins) {
    if (!plugin || typeof plugin !== "object") continue;
    if ("outputOptions" in plugin) delete plugin.outputOptions;
    if (plugin.name === "vite-plugin-qwik-post" && "generateBundle" in plugin)
      delete plugin.generateBundle;
  }
}
/**
 * Filters Astro's vite plugins down to those safe/needed for the standalone
 * Qwik client build — keeps alias resolution, virtual modules, etc. while
 * stripping Astro-internal build orchestration and our own qwik plugins.
 */
export function filterAstroPlugins(plugins: PluginOption[]): PluginOption[] {
  return (plugins?.flatMap((p) => (Array.isArray(p) ? p : [p])) ?? [])
    .filter((plugin): plugin is { name: string } & NonNullable<PluginOption> => {
      return plugin != null && typeof plugin === "object" && "name" in plugin;
    })
    .filter((plugin) => {
      const isQwikPlugin =
        plugin.name === "vite-plugin-qwik" ||
        plugin.name === "vite-plugin-qwik-post" ||
        plugin.name === "astro-qwik-post";
      const isCoreBuildPlugin = plugin.name === "astro:build";
      const isAstroBuildPlugin = plugin.name.startsWith("astro:build");
      const isAstroInternalPlugin = plugin.name.includes("@astro");
      const isAstroTransitionPlugin = plugin.name === "astro:transitions";

      const isAllowedPlugin =
        plugin.name.includes("virtual") || plugin.name === "astro:tsconfig-alias";

      if (isAllowedPlugin) return true;

      return !(
        isCoreBuildPlugin ||
        isAstroInternalPlugin ||
        isAstroBuildPlugin ||
        isAstroTransitionPlugin ||
        isQwikPlugin
      );
    });
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
  astroViteConfig: InlineConfig;
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

  const astroPlugins = filterAstroPlugins(
    (opts.astroViteConfig.plugins as PluginOption[]) ?? []
  );

  const { root, resolve } = opts.astroViteConfig;

  await build({
    ...(root ? { root } : {}),
    ...(resolve ? { resolve } : {}),
    plugins: [...astroPlugins, qwikVite(config)],
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
