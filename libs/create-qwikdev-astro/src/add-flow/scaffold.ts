import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { __dirname } from "../utils.js";
import type { JsxStrategy } from "./jsx-strategy.js";

/** Path to the Counter.tsx template in the stubs directory */
const COUNTER_TEMPLATE_PATH = join(
  __dirname,
  "..",
  "stubs",
  "templates",
  "qwik-component",
  "Counter.tsx"
);

/**
 * Scaffold a Qwik example Counter component into the target project.
 *
 * The component is placed at `{projectDir}/src/components/qwik/Counter.tsx`.
 * When Qwik is secondary (strategy.pragma is not null), the pragma is prepended
 * as the first line so TypeScript knows to use @qwik.dev/core as the JSX factory
 * for this file specifically.
 *
 * @param projectDir - Root directory of the target Astro project
 * @param strategy - JSX strategy (determines whether to prepend pragma)
 * @param dryRun - If true, skip file system writes (for testing/preview)
 * @returns The absolute path to the scaffolded Counter.tsx file
 */
export async function scaffoldQwikComponent(
  projectDir: string,
  strategy: JsxStrategy,
  dryRun = false
): Promise<string> {
  const targetDir = join(projectDir, "src", "components", "qwik");
  const targetPath = join(targetDir, "Counter.tsx");

  const templateContent = await readFile(COUNTER_TEMPLATE_PATH, "utf-8");

  const outputContent =
    strategy.pragma !== null ? `${strategy.pragma}\n${templateContent}` : templateContent;

  if (!dryRun) {
    await mkdir(targetDir, { recursive: true });
    await writeFile(targetPath, outputContent, "utf-8");
  }

  return targetPath;
}
