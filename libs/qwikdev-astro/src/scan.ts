import { execFile } from "node:child_process";
import { resolve } from "node:path";
import { promisify } from "node:util";
import type { AstroConfig } from "astro";
import { QWIK_ENTRYPOINT_PATTERN, SCAN_EXTENSIONS } from "./constants";

const execFileAsync = promisify(execFile);

export function getRelativePath(from: string, to: string) {
  return to.replace(from, "") || ".";
}

/** Scans the project source for files that import from Qwik or have `.qwik.` in their path. */
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
    if (!relativePath.includes("node_modules") && !filter(absolutePath)) continue;
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
