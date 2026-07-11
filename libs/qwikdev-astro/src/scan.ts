import { execFile } from "node:child_process";
import { readFile, readdir } from "node:fs/promises";
import { join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import type { AstroConfig } from "astro";
import { QWIK_ENTRYPOINT_PATTERN, SCAN_EXTENSIONS } from "./constants";

const execFileAsync = promisify(execFile);

export function getRelativePath(from: string, to: string) {
  return relative(from, to) || ".";
}

// needed for qwik optimizer path resolution
export function resolveQwikPaths(config: AstroConfig) {
  const root = config.root.pathname;
  const srcDir = getRelativePath(root, config.srcDir.pathname);
  const clientDir = getRelativePath(root, config.build.client.pathname);
  const serverDir = getRelativePath(root, config.build.server.pathname);

  let finalDir: string;
  if (config.adapter) {
    finalDir = clientDir;
    if (config.adapter.name.includes("vercel")) {
      const outDirUrl = new URL(config.outDir.pathname, config.root);
      config.build.client = outDirUrl;
      finalDir = config.build.client.pathname;
    }
  } else {
    finalDir = getRelativePath(root, config.outDir.pathname);
  }

  return { srcDir, serverDir, finalDir };
}

export function createQwikFileFilter(filter: (id: string) => boolean) {
  return (id: string, hook: string) => {
    if (hook === "transform") {
      if (id.includes(".qwik.")) return true;
      if (!filter(id)) return false;
    }
    return true;
  };
}

export async function scanQwikEntrypoints(
  config: AstroConfig,
  filter: (id: string) => boolean,
  debug?: boolean
): Promise<Set<string>> {
  const rootDir = fileURLToPath(config.root);
  const files = (await grepQwikFiles(rootDir)) ?? (await walkQwikFiles(rootDir));

  const entrypoints = new Set<string>();
  for (const absolutePath of files.sort()) {
    if (absolutePath.includes("node_modules") || !filter(absolutePath)) continue;
    entrypoints.add(absolutePath);
    if (debug) console.debug(`[qwikdev/astro] Found Qwik entrypoint: ${absolutePath}`);
  }

  return entrypoints;
}

/** Lists files matching the Qwik entrypoint pattern with grep, or null when grep is unavailable. */
async function grepQwikFiles(cwd: string): Promise<string[] | null> {
  try {
    const result = await execFileAsync(
      "grep",
      [
        "-rl",
        ...SCAN_EXTENSIONS.map((ext) => `--include=${ext}`),
        "-E",
        QWIK_ENTRYPOINT_PATTERN.source,
        "."
      ],
      { cwd, encoding: "utf-8" }
    );
    const stdout = result.stdout.trim();
    if (!stdout) return [];
    return stdout.split("\n").map((relativePath) => resolve(cwd, relativePath));
  } catch (error) {
    // grep exits with 1 when no files match
    if ((error as { code?: number | string }).code === 1) return [];
    return null;
  }
}

/** Fallback for hosts without grep (e.g. Windows): recursively scans for files matching the Qwik entrypoint pattern. */
async function walkQwikFiles(rootDir: string): Promise<string[]> {
  const extensions = SCAN_EXTENSIONS.map((ext) => ext.slice(1));
  const files: string[] = [];

  async function walk(dir: string): Promise<void> {
    const entries = await readdir(dir, { withFileTypes: true }).catch(() => []);
    await Promise.all(
      entries.map(async (entry) => {
        const path = join(dir, entry.name);
        if (entry.isDirectory()) {
          if (entry.name === "node_modules" || entry.name === ".git") return;
          return walk(path);
        }
        if (!extensions.some((ext) => entry.name.endsWith(ext))) return;
        const content = await readFile(path, "utf-8").catch(() => "");
        if (QWIK_ENTRYPOINT_PATTERN.test(content)) files.push(path);
      })
    );
  }

  await walk(rootDir);
  return files;
}
