import ts from "typescript";

export const qwikModules = [
  "@builder.io/qwik",
  "@builder.io/qwik-react",
  "@qwikdev/core",
  "@qwikdev/qwik-react"
];

import type { Plugin } from "vite";

export function qwikTransformPlugin(filter: (id: unknown) => boolean): Plugin {
  const entrypoints: Set<string> = new Set();

  return {
    name: "qwik-transform-plugin",
    enforce: "pre",

    async transform(code, id) {
      if (filter(id) || entrypoints.has(id)) {
        const sourceFile = ts.createSourceFile(id, code, ts.ScriptTarget.Latest, true);

        const hasQwikImport = ts.forEachChild(sourceFile, (node) => {
          return (
            ts.isImportDeclaration(node) &&
            ts.isStringLiteral(node.moduleSpecifier) &&
            qwikModules.includes(node.moduleSpecifier.text)
          );
        });

        if (hasQwikImport) {
          entrypoints.add(id);
          console.log("New Qwik entrypoint found:", id);
        }
      }
      return null;
    },

    api: {
      getEntrypoints: () => Array.from(entrypoints)
    }
  };
}
