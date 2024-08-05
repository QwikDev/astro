import fs from "node:fs";
import path from "node:path";
import ts from "typescript";
import { crawlDirectory } from "./utils";

export const qwikModules = [
  "@builder.io/qwik",
  "@builder.io/qwik-react",
  "@qwikdev/core",
  "@qwikdev/qwik-react"
];

export async function getQwikEntrypoints(
  dir: string,
  filter: (id: unknown) => boolean
): Promise<string[]> {
  const files = await crawlDirectory(dir);
  const qwikFiles = [];

  // Find project entrypoints
  for (const file of files) {
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

  // Find library entrypoints
  const nodeModulesPath = path.resolve(dir, "..", "node_modules");
  const libraryEntrypoints = findQwikLibraryEntrypoints(nodeModulesPath);

  return [...qwikFiles, ...libraryEntrypoints];
}

function findQwikLibraryEntrypoints(nodeModulesPath: string): string[] {
  const entrypoints: string[] = [];

  function searchDirectory(dirPath: string) {
    const items = fs.readdirSync(dirPath);

    for (const item of items) {
      const fullPath = path.join(dirPath, item);
      const stat = fs.statSync(fullPath);

      if (stat.isDirectory()) {
        // Skip nested node_modules to avoid redundant searches
        if (item === "node_modules") {
          continue;
        }
        searchDirectory(fullPath);
      } else if (stat.isFile() && item.includes(".qwik.")) {
        entrypoints.push(fullPath);
      }
    }
  }

  searchDirectory(nodeModulesPath);
  return entrypoints;
}
