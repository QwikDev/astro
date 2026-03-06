import { execFile } from "node:child_process";
import { relative, resolve } from "node:path";
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
  const rootDir = config.root.pathname;
  const stdout = await grepQwikFiles(rootDir);
  if (!stdout) return new Set();

  const files = stdout.split("\n");
  const entrypoints = new Set<string>();
  for (const relativePath of files) {
    const absolutePath = resolve(rootDir, relativePath);
    if (relativePath.includes("node_modules") || !filter(absolutePath)) continue;
    entrypoints.add(absolutePath);
    if (debug) console.debug(`[qwikdev/astro] Found Qwik entrypoint: ${absolutePath}`);
  }

  return entrypoints;
}

async function grepQwikFiles(cwd: string): Promise<string> {
  try {
    const result = await execFileAsync(
      "grep",
      ["-rl", ...SCAN_EXTENSIONS.map((ext) => `--include=${ext}`), "-E", QWIK_ENTRYPOINT_PATTERN.source, "."],
      { cwd, encoding: "utf-8" }
    );
    return result.stdout.trim();
  } catch {
    return "";
  }
}
