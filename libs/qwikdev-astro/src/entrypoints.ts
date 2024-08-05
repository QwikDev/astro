import fs from "node:fs";
import ts from "typescript";
import { crawlDirectory } from "./utils";

// previous & current versions of qwik & qwik-react
export const qwikModules = [
  "@builder.io/qwik",
  "@builder.io/qwik-react",
  "@qwikdev/core",
  "@qwikdev/qwik-react"
];

/** We need to find the Qwik entrypoints so that the client build will run successfully. */
export async function getQwikEntrypoints(
  dir: string,
  filter: (id: unknown) => boolean
): Promise<string[]> {
  const files = await crawlDirectory(dir);
  const qwikFiles = [];

  for (const file of files) {
    // Skip files not matching patterns w/ astro config include & exclude
    if (!filter(file)) {
      continue;
    }

    const fileContent = fs.readFileSync(file, "utf-8");
    const sourceFile = ts.createSourceFile(
      file,
      fileContent,
      ts.ScriptTarget.ESNext,
      true
    );

    let qwikImportFound = false;

    ts.forEachChild(sourceFile, function nodeVisitor(node) {
      if (ts.isImportDeclaration(node) && ts.isStringLiteral(node.moduleSpecifier)) {
        if (qwikModules.includes(node.moduleSpecifier.text)) {
          qwikImportFound = true;
        }
      }

      if (!qwikImportFound) {
        ts.forEachChild(node, nodeVisitor);
      }
    });

    if (qwikImportFound) {
      qwikFiles.push(file);
    }
  }

  return qwikFiles;
}
