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
  const processedModules: Set<string> = new Set();

  return {
    name: "qwik-transform-plugin",
    enforce: "pre",

    async transform(code, id) {
      if (filter(id) || entrypoints.has(id)) {
        if (!processedModules.has(id)) {
          processedModules.add(id);
          const sourceFile = ts.createSourceFile(id, code, ts.ScriptTarget.Latest, true);
          let hasQwikImport = false;

          const importedModules: string[] = [];

          ts.forEachChild(sourceFile, (node) => {
            if (
              ts.isImportDeclaration(node) &&
              ts.isStringLiteral(node.moduleSpecifier)
            ) {
              const importPath = node.moduleSpecifier.text;
              if (qwikModules.includes(importPath)) {
                hasQwikImport = true;
              }
              importedModules.push(importPath);
            }
          });

          if (hasQwikImport) {
            entrypoints.add(id);
            console.log("New Qwik entrypoint found:", id);

            // Process transitive dependencies
            for (const importedModule of importedModules) {
              const resolvedModule = await this.resolve(importedModule, id);
              if (resolvedModule) {
                await this.load({ id: resolvedModule.id });
              }
            }
          }
        }
      }

      return null;
    },

    api: {
      getEntrypoints: () => Array.from(entrypoints)
    }
  };
}
