import type { Plugin } from "vite";

export const qwikModules = [
  "@builder.io/qwik",
  "@builder.io/qwik-react",
  "@qwikdev/core",
  "@qwikdev/qwik-react"
];

export function qwikEntrypointsPlugin(filter: (id: string) => boolean): Plugin {
  const entrypoints: Set<string> = new Set();

  return {
    name: "qwik-entrypoints-plugin",
    enforce: "pre",

    async resolveId(source, importer) {
      if (importer && filter(source)) {
        const resolved = await this.resolve(source, importer, { skipSelf: true });
        if (resolved) {
          entrypoints.add(resolved.id);
          console.log(entrypoints);
        }
      }
      return null;
    },
    api: {
      getEntrypoints: () => Array.from(entrypoints)
    }
  };
}
