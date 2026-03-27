import fs from "node:fs";
import path from "node:path";

/**
 * Maps old package specifiers to their new equivalents in Qwik v2 / @qwik.dev namespace.
 */
export const PACKAGE_MAP: Record<string, string> = {
  "@builder.io/qwik": "@qwik.dev/core",
  "@builder.io/qwik/jsx-runtime": "@qwik.dev/core/jsx-runtime",
  "@builder.io/qwik/jsx-dev-runtime": "@qwik.dev/core/jsx-dev-runtime",
  "@builder.io/qwik/build": "@qwik.dev/core/build",
  "@builder.io/qwik/server": "@qwik.dev/core/server",
  "@builder.io/qwik/optimizer": "@qwik.dev/core/optimizer",
  "@qwikdev/astro": "@qwik.dev/astro"
};

const SKIP_DIRS = new Set(["node_modules", "dist", ".astro", ".git"]);

const SOURCE_EXTENSIONS = new Set([
  ".ts",
  ".tsx",
  ".js",
  ".jsx",
  ".mjs",
  ".mts",
  ".astro",
  ".mdx"
]);

/**
 * Recursively walk a directory and return all files matching the given extensions.
 * Skips node_modules, dist, .astro, and .git directories.
 */
export function walkFiles(dir: string, extensions: string[]): string[] {
  const extSet = new Set(extensions);
  const results: string[] = [];

  function walk(current: string): void {
    let entries: fs.Dirent[];

    try {
      entries = fs.readdirSync(current, { withFileTypes: true });
    } catch {
      return;
    }

    for (const entry of entries) {
      if (entry.isDirectory()) {
        if (!SKIP_DIRS.has(entry.name)) {
          walk(path.join(current, entry.name));
        }
      } else if (entry.isFile()) {
        if (extSet.has(path.extname(entry.name))) {
          results.push(path.join(current, entry.name));
        }
      }
    }
  }

  walk(dir);
  return results;
}

/**
 * Rewrite package imports in a single file using PACKAGE_MAP string replacements.
 * Longer/more-specific keys are processed before shorter ones to avoid partial replacements.
 */
export function rewriteFileImports(
  filePath: string,
  dryRun: boolean
): { changed: boolean; replacements: string[] } {
  let content: string;

  try {
    content = fs.readFileSync(filePath, "utf8");
  } catch {
    return { changed: false, replacements: [] };
  }

  let updated = content;
  const replacements: string[] = [];

  // Sort keys longest-first so more-specific subpaths are replaced before their prefix
  const sortedKeys = Object.keys(PACKAGE_MAP).sort((a, b) => b.length - a.length);

  for (const oldPkg of sortedKeys) {
    const newPkg = PACKAGE_MAP[oldPkg];
    if (updated.includes(oldPkg)) {
      updated = updated.split(oldPkg).join(newPkg);
      replacements.push(`${oldPkg} -> ${newPkg}`);
    }
  }

  const changed = updated !== content;

  if (changed && !dryRun) {
    fs.writeFileSync(filePath, updated, "utf8");
  }

  return { changed, replacements };
}

/**
 * Recursively rewrite package imports in all source files under dir.
 */
export function rewriteImports(
  dir: string,
  dryRun: boolean
): { changedFiles: string[]; allReplacements: string[] } {
  const extensions = Array.from(SOURCE_EXTENSIONS);
  const files = walkFiles(dir, extensions);

  const changedFiles: string[] = [];
  const allReplacements: string[] = [];

  for (const file of files) {
    const result = rewriteFileImports(file, dryRun);
    if (result.changed) {
      changedFiles.push(file);
      allReplacements.push(...result.replacements);
    }
  }

  return { changedFiles, allReplacements };
}

/**
 * Rewrite tsconfig.json jsxImportSource from @builder.io/qwik to @qwik.dev/core.
 */
export function rewriteTsconfig(
  dir: string,
  dryRun: boolean
): { changed: boolean; oldValue?: string; newValue?: string } {
  const tsconfigPath = path.join(dir, "tsconfig.json");

  if (!fs.existsSync(tsconfigPath)) {
    return { changed: false };
  }

  let content: string;
  try {
    content = fs.readFileSync(tsconfigPath, "utf8");
  } catch {
    return { changed: false };
  }

  let tsconfig: Record<string, any>;
  try {
    tsconfig = JSON.parse(content);
  } catch {
    return { changed: false };
  }

  const compilerOptions = tsconfig.compilerOptions as Record<string, any> | undefined;
  if (!compilerOptions) {
    return { changed: false };
  }

  const currentValue = compilerOptions.jsxImportSource;
  if (currentValue !== "@builder.io/qwik") {
    return { changed: false };
  }

  const newValue = "@qwik.dev/core";
  compilerOptions.jsxImportSource = newValue;

  if (!dryRun) {
    fs.writeFileSync(tsconfigPath, JSON.stringify(tsconfig, null, 2), "utf8");
  }

  return { changed: true, oldValue: currentValue, newValue };
}

/**
 * Rewrite astro.config.* to replace @qwikdev/astro import with @qwik.dev/astro.
 */
export function rewriteAstroConfig(
  dir: string,
  dryRun: boolean
): { changed: boolean; filePath?: string; replacements: string[] } {
  const candidateExtensions = [".mjs", ".ts", ".mts", ".js"];
  const oldPkg = "@qwikdev/astro";
  const newPkg = "@qwik.dev/astro";

  for (const ext of candidateExtensions) {
    const filePath = path.join(dir, `astro.config${ext}`);

    if (!fs.existsSync(filePath)) {
      continue;
    }

    let content: string;
    try {
      content = fs.readFileSync(filePath, "utf8");
    } catch {
      continue;
    }

    if (!content.includes(oldPkg)) {
      return { changed: false, filePath, replacements: [] };
    }

    const updated = content.split(oldPkg).join(newPkg);

    if (!dryRun) {
      fs.writeFileSync(filePath, updated, "utf8");
    }

    return {
      changed: true,
      filePath,
      replacements: [`${oldPkg} -> ${newPkg}`]
    };
  }

  return { changed: false, replacements: [] };
}

/**
 * Scan source files for @jsxImportSource pragma comments and rewrite them.
 * Note: rewriteImports already handles the underlying string replacement via PACKAGE_MAP.
 * This function provides explicit tracking of which files had pragma comments changed.
 */
export function rewritePragmaComments(
  dir: string,
  dryRun: boolean
): { changedFiles: string[] } {
  const extensions = Array.from(SOURCE_EXTENSIONS);
  const files = walkFiles(dir, extensions);
  const changedFiles: string[] = [];
  const pragmaOld = "@jsxImportSource @builder.io/qwik";
  const pragmaNew = "@jsxImportSource @qwik.dev/core";

  for (const file of files) {
    let content: string;
    try {
      content = fs.readFileSync(file, "utf8");
    } catch {
      continue;
    }

    if (!content.includes(pragmaOld)) {
      continue;
    }

    const updated = content.split(pragmaOld).join(pragmaNew);

    if (!dryRun) {
      fs.writeFileSync(file, updated, "utf8");
    }

    changedFiles.push(file);
  }

  return { changedFiles };
}

/**
 * Scan source files for deprecated async useComputed$ and useResource$ patterns.
 * These patterns changed behavior in Qwik v2 and should be reviewed.
 * Returns file path, line number (1-based), and pattern name for each match.
 */
export function scanForAsyncPatterns(
  dir: string
): { file: string; line: number; pattern: string }[] {
  const extensions = Array.from(SOURCE_EXTENSIONS);
  const files = walkFiles(dir, extensions);
  const results: { file: string; line: number; pattern: string }[] = [];
  const asyncPattern = /use(Computed|Resource)\$\(\s*async/g;

  for (const file of files) {
    let content: string;
    try {
      content = fs.readFileSync(file, "utf8");
    } catch {
      continue;
    }

    const lines = content.split("\n");
    for (let i = 0; i < lines.length; i++) {
      asyncPattern.lastIndex = 0;
      let match: RegExpExecArray | null;
      while ((match = asyncPattern.exec(lines[i])) !== null) {
        results.push({
          file,
          line: i + 1,
          pattern: `use${match[1]}$`
        });
      }
    }
  }

  return results;
}
