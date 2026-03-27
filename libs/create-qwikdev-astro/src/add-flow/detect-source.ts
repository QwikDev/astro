import { readdir } from "node:fs/promises";
import { extname, join } from "node:path";
import type { SourceSignal } from "./types.js";

/** Extensions to scan */
const SCAN_EXTENSIONS = new Set([".ts", ".tsx", ".js", ".jsx", ".astro"]);

/** Directories to skip */
const SKIP_DIRS = new Set(["node_modules", "dist", ".astro"]);

/** Max bytes to read per file for signal detection */
const MAX_READ_BYTES = 2048;

/** Recognized framework package patterns */
const FRAMEWORK_IMPORT_PATTERNS: Array<{
  framework: string;
  pattern: RegExp;
}> = [
  {
    framework: "react",
    pattern: /from\s+['"]react(\/[^'"]*)?['"]/
  },
  {
    framework: "preact",
    pattern: /from\s+['"]preact(\/[^'"]*)?['"]/
  },
  {
    framework: "solid",
    pattern: /from\s+['"]solid-js(\/[^'"]*)?['"]/
  }
];

/** JSX pragma patterns */
const PRAGMA_PATTERNS: Array<{
  framework: string;
  pattern: RegExp;
}> = [
  {
    framework: "react",
    pattern: /@jsxImportSource\s+react/
  },
  {
    framework: "preact",
    pattern: /@jsxImportSource\s+preact/
  },
  {
    framework: "solid",
    pattern: /@jsxImportSource\s+solid-js/
  }
];

/**
 * Recursively collect scannable files from a directory, skipping SKIP_DIRS.
 */
async function collectFiles(dir: string): Promise<string[]> {
  const entries = await readdir(dir, { withFileTypes: true }).catch(() => []);
  const results: string[] = [];

  for (const entry of entries) {
    if (entry.isDirectory()) {
      if (SKIP_DIRS.has(entry.name)) continue;
      const subFiles = await collectFiles(join(dir, entry.name));
      results.push(...subFiles);
    } else if (entry.isFile()) {
      const ext = extname(entry.name);
      if (SCAN_EXTENSIONS.has(ext)) {
        results.push(join(dir, entry.name));
      }
    }
  }

  return results;
}

/**
 * Detect framework signals in a single file's content snippet.
 */
function detectSignalsInContent(
  filePath: string,
  content: string,
  seenFrameworks: Set<string>
): SourceSignal[] {
  const signals: SourceSignal[] = [];

  // Check pragma first (more specific)
  for (const { framework, pattern } of PRAGMA_PATTERNS) {
    if (seenFrameworks.has(`${filePath}:${framework}`)) continue;
    if (pattern.test(content)) {
      signals.push({ framework, file: filePath, signal: "pragma" });
      seenFrameworks.add(`${filePath}:${framework}`);
    }
  }

  // Check import statements
  for (const { framework, pattern } of FRAMEWORK_IMPORT_PATTERNS) {
    if (seenFrameworks.has(`${filePath}:${framework}`)) continue;
    if (pattern.test(content)) {
      signals.push({ framework, file: filePath, signal: "import" });
      seenFrameworks.add(`${filePath}:${framework}`);
    }
  }

  return signals;
}

/**
 * Scan a project directory for framework usage signals in source files.
 *
 * Scans the `src/` directory (if present) recursively, or the project root as fallback.
 * Skips node_modules, dist, and .astro directories.
 * Reads only the first 2KB of each file for performance.
 *
 * Returns one SourceSignal per framework per file (deduplicated).
 */
export async function detectSourceFrameworks(
  projectDir: string
): Promise<SourceSignal[]> {
  // Prefer scanning src/ if it exists, fall back to projectDir
  const srcDir = join(projectDir, "src");
  const scanDir = await readdir(srcDir)
    .then(() => srcDir)
    .catch(() => projectDir);

  const files = await collectFiles(scanDir);
  const signals: SourceSignal[] = [];
  const seenFrameworks = new Set<string>();

  for (const filePath of files) {
    // Read only first MAX_READ_BYTES bytes
    let content: string;
    try {
      const { createReadStream } = await import("node:fs");
      const stream = createReadStream(filePath, { start: 0, end: MAX_READ_BYTES - 1 });
      const chunks: Buffer[] = [];
      for await (const chunk of stream) {
        chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
      }
      content = Buffer.concat(chunks).toString("utf8");
    } catch {
      continue;
    }

    const fileSignals = detectSignalsInContent(filePath, content, seenFrameworks);
    signals.push(...fileSignals);
  }

  return signals;
}
