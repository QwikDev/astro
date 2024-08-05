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
  const entrypoints = [];
  const packages = fs.readdirSync(nodeModulesPath);

  for (const pkg of packages) {
    const pkgPath = path.join(nodeModulesPath, pkg);
    const libPath = path.join(pkgPath, "lib");
    const entrypointPath = path.join(libPath, "index.qwik.mjs");

    if (fs.existsSync(entrypointPath)) {
      entrypoints.push(entrypointPath);
    }
  }

  return entrypoints;
}
