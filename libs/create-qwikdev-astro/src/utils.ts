import fs, { readdirSync, statSync } from "node:fs";
import os from "node:os";
import path, { join, resolve, relative, basename } from "node:path";
import { fileURLToPath } from "node:url";
import { copySync, ensureDirSync, pathExistsSync } from "fs-extra/esm";
import type { ProcessOptions, ProcessResult } from "panam/executor";
import pm from "panam/pm";

/**
 * Assert that a panam command result indicates success.
 * panam resolves `{ status: false, error }` instead of throwing on failure,
 * so callers must check explicitly.
 */
export function assertPmResult(
  result: { status: boolean; error?: unknown },
  label: string
): void {
  if (!result.status) {
    throw new Error(`${label} failed${result.error ? `: ${result.error}` : ""}`);
  }
}

/**
 * Qualify an executable spec for the active runtime.
 *
 * Deno's `run`/`exec` resolves a bare specifier such as `astro` as a FILE PATH
 * relative to the cwd, so `pm.x("astro add …")` fails with
 * `Module not found file:///…/astro`. Prefixing with `npm:` tells Deno to
 * resolve the executable from npm instead. Every other package manager takes
 * the command unchanged.
 */
export function npmSpec(command: string): string {
  return pm.isDeno() ? `npm:${command}` : command;
}

/**
 * Run a CLI that lives in the project's local `node_modules/.bin` (currently
 * only `astro add …`) through the active package manager.
 *
 * WHY yarn is special-cased: panam maps `pm.x()` onto `yarn exec` for yarn
 * (`PackageManager#x` delegates to `#exec`, which emits `exec` for pnpm/yarn).
 * On Windows, `yarn exec <bin>` cannot resolve a locally installed binary:
 * npm-style installs write BOTH an extension-less sh wrapper (`.bin/astro`) and
 * a cmd shim (`.bin/astro.cmd`), and yarn v1's exec only ever looks for the
 * extension-less file — which cmd.exe cannot execute. Every `astro add` call
 * therefore failed on Windows + yarn, `assertPmResult` threw, and the CLI
 * panicked (issue #294).
 *
 * `yarn run <bin> …` goes through yarn's own PATH setup, which prepends
 * `node_modules/.bin` and lets the OS pick the `.cmd` shim, so it resolves the
 * same binary on every platform.
 *
 * Every other package manager keeps the exact `pm.x(npmSpec(command))` path it
 * has always used, including the deno `npm:` prefix applied by `npmSpec`.
 */
export function execLocalBin(
  command: string,
  options?: ProcessOptions
): Promise<ProcessResult> {
  return pm.isYarn() ? pm.run(command, options) : pm.x(npmSpec(command), options);
}

/**
 * Render an unknown thrown value as one diagnostic sentence, keeping any
 * `stderr` / `stdout` / `cause` detail the error happens to carry.
 *
 * WHY: the panic template used to be `${e.message ?? e}: .`, which threw away
 * every detail a failed subprocess reported — the CI logs for issue #294 read
 * literally "failed: .", which says something broke but not which command or
 * why. Surface whatever the error actually knows instead.
 */
export function describeError(error: unknown): string {
  const detail = (value: unknown): string => {
    if (value === undefined || value === null) return "";
    if (value instanceof Error) return value.message.trim();
    if (typeof value === "string") return value.trim();
    return String(value).trim();
  };

  const parts = [detail(error) || "Unknown error"];

  if (typeof error === "object" && error !== null) {
    const source = error as { stderr?: unknown; stdout?: unknown; cause?: unknown };

    for (const [label, value] of [
      ["stderr", source.stderr],
      ["stdout", source.stdout],
      ["cause", source.cause]
    ] as const) {
      const text = detail(value);
      // Skip empty streams and detail already contained in the message itself.
      if (text && !parts.some((part) => part.includes(text))) {
        parts.push(`${label}: ${text}`);
      }
    }
  }

  const message = parts.join(" | ");

  return /[.!?:]$/.test(message) ? message : `${message}.`;
}

export const __filename = getModuleFilename();
export const __dirname = path.dirname(__filename);

export function safeCopy(source: string, target: string): void {
  statSync(source).isDirectory()
    ? safeCopyDir(source, target)
    : safeCopyFile(source, target);
}

export function safeCopyDir(sourceDir: string, targetDir: string): void {
  const files = readdirSync(sourceDir);
  ensureDirSync(targetDir);

  for (const file of files) {
    safeCopy(join(sourceDir, file), join(targetDir, file));
  }
}

export function safeCopyFile(sourceFile: string, targetFile: string): void {
  const name = basename(sourceFile);

  if (!pathExistsSync(targetFile)) {
    copySync(sourceFile, targetFile);
  } else if (name.endsWith(".json")) {
    deepMergeJsonFile(targetFile, sourceFile, true);
  } else if (name.startsWith(".") && name.endsWith("ignore")) {
    mergeDotIgnoreFiles(targetFile, sourceFile, true);
  }
}

export function deepMergeJsonFile<T>(
  targetJsonPath: string,
  sourceJsonPath: string,
  replace = false
): T {
  const deepMerge = deepMergeJson<T>(
    fileGetContents(targetJsonPath),
    fileGetContents(sourceJsonPath)
  );

  if (replace) {
    putJson(targetJsonPath, deepMerge);
  }

  return deepMerge;
}

export function deepMergeJson<T>(targetJson: string, sourceJson: string): T {
  return deepMerge(JSON.parse(targetJson), JSON.parse(sourceJson)) as unknown as T;
}

export function deepMerge<T>(target: T, source: Partial<T>): T {
  for (const key of Object.keys(source) as (keyof T)[]) {
    const targetValue = target[key];
    const sourceValue = source[key] as Partial<T[keyof T]>;

    if (isObject(targetValue) && isObject(sourceValue)) {
      target[key] = deepMerge(targetValue, sourceValue);
    } else if (Array.isArray(targetValue) && Array.isArray(sourceValue)) {
      target[key] = Array.from(new Set([...targetValue, ...sourceValue])) as any;
    } else {
      target[key] = sourceValue as T[keyof T];
    }
  }
  return target;
}

function isObject(item: unknown): item is Record<string, any> {
  return item !== null && typeof item === "object" && !Array.isArray(item);
}

export function mergeDotIgnoreFiles(
  target: string,
  source: string,
  replace = false
): string {
  const contents = mergeDotIgnoreContents(
    fileGetContents(target),
    fileGetContents(source)
  );

  if (replace) {
    filePutContents(target, contents);
  }

  return contents;
}

export function mergeDotIgnoreContents(content1: string, content2: string): string {
  return mergeDotIgnoreLines(content1.split("\n"), content2.split("\n")).join("\n");
}

export function mergeDotIgnoreLines(lines1: string[], lines2: string[]): string[] {
  const lines = Array.from(
    new Set([...lines1.map((line) => line.trim()), ...lines2.map((line) => line.trim())])
  ).filter((line) => line !== "");

  return formatLines(lines);
}

function formatLines(lines: string[]): string[] {
  const formattedLines: string[] = [];
  let previousWasComment = false;

  lines.forEach((line, index) => {
    const isComment = line.startsWith("#");

    if (isComment && !previousWasComment && index !== 0) {
      formattedLines.push("");
    }

    formattedLines.push(line);
    previousWasComment = isComment;
  });

  return formattedLines;
}

export function getModuleFilename(): string {
  const error = new Error();
  const stack = error.stack;
  const matches = stack?.match(
    /^Error\s+at[^\r\n]+\s+at *(?:[^\r\n(]+\((.+?)(?::\d+:\d+)?\)|(.+?)(?::\d+:\d+)?) *([\r\n]|$)/
  );
  const filename = matches?.[1] || matches?.[2];
  if (filename?.startsWith("file://")) {
    return fileURLToPath(filename);
  }
  return filename || fileURLToPath(import.meta.url);
}

export function isCI(): boolean {
  return Boolean(process.env.CI || process.env.GITHUB_ACTIONS);
}

export function isTest(): boolean {
  return process.env.NODE_ENV === "test";
}

export function isHome(dir: string): boolean {
  return dir.startsWith(process.env.HOME ?? "~/");
}

export function resolveAbsoluteDir(dir: string) {
  return isHome(dir) ? resolve(os.homedir(), dir) : resolve(process.cwd(), dir);
}

export function resolveRelativeDir(dir: string) {
  return isHome(dir) ? relative(os.homedir(), dir) : relative(process.cwd(), dir);
}

export function notEmptyDir(dir: string): boolean {
  return fs.existsSync(dir) && fs.readdirSync(dir).length > 0;
}

// Used from https://github.com/QwikDev/qwik/blob/main/packages/create-qwik/src/helpers/clearDir.ts
export const clearDir = async (dir: string) => {
  const files = await fs.promises.readdir(dir);

  return await Promise.all(
    files.map((pathToFile) => fs.promises.rm(join(dir, pathToFile), { recursive: true }))
  );
};

function fileGetContents(file: string): string {
  if (!fs.existsSync(file)) {
    throw new Error(`File ${file} not found`);
  }
  return fs.readFileSync(file, { encoding: "utf8" }).toString();
}

function filePutContents(file: string, contents: string) {
  return fs.writeFileSync(file, contents, { encoding: "utf8" });
}

function fileReplaceContents(file: string, search: string | RegExp, replace: string) {
  let contents = fileGetContents(file);
  contents = contents.replace(search, replace);
  filePutContents(file, contents);
}

export function getPackageJsonPath(dir = __dirname): string {
  return join(dir, "package.json");
}

function packageJsonReplace(dir: string, search: string | RegExp, replace: string) {
  fileReplaceContents(getPackageJsonPath(dir), search, replace);
}

export function replacePackageJsonRunCommand(dir: string) {
  packageJsonReplace(dir, /npm run/g, pm.runCommand());
}

const npmPackageNamePattern =
  /^(?:(?:@[a-z0-9-*~][a-z0-9-*._~]*\/)?[a-z0-9-~][a-z0-9-._~]*)$/;

export function sanitizePackageName(name: string): string {
  name = name
    .trim()
    .replace(/\\/g, "/")
    .split("/")
    .filter(Boolean)
    .map((segment) =>
      segment
        .toLowerCase()
        .replace(/[^a-z0-9-_]/g, "-")
        .replace(/^-+|-+$/g, "")
    )
    .join("-");
  name = name.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  name = name.replace(/[^a-zA-Z0-9\-._~/@]/g, "-");
  name = name.replace(/^[-.]+|[-.]+$/g, "");
  name = name.replace(/[-.]{2,}/g, "-");
  name = name.toLowerCase();

  return name;
}

function isValidPackageName(name: string): boolean {
  return npmPackageNamePattern.test(name);
}

function validatePackageName(name: string): string {
  name = sanitizePackageName(name);

  if (!isValidPackageName(name)) {
    throw new Error(`Invalid package name: ${name}`);
  }

  return name;
}

export function getPackageJson(dir: string): Record<string, any> {
  const packageJsonPath = getPackageJsonPath(dir);

  return JSON.parse(fileGetContents(packageJsonPath));
}

export function setPackageJson(dir: string, json: Record<string, any>) {
  putJson(getPackageJsonPath(dir), json);
}

export function putJson<T>(path: string, json: T) {
  filePutContents(path, JSON.stringify(json, null, 2));
}

export function updatePackageName(newName: string, dir = __dirname): void {
  const cleanedName = validatePackageName(newName);
  const packageJson = getPackageJson(dir);

  packageJson.name = cleanedName;
  setPackageJson(dir, packageJson);
}

/**
 * Strip JSON comments (// and /* *\/) and trailing commas from a JSONC string,
 * returning a string that can be safely passed to JSON.parse.
 *
 * Correctly handles:
 * - Single-line comments:  // ...
 * - Block comments:        /* ... *\/
 * - String literals (comments inside strings are preserved)
 * - Trailing commas before } or ]
 */
export function stripJsonComments(text: string): string {
  let result = "";
  let i = 0;
  while (i < text.length) {
    // Skip strings — preserve their content verbatim
    if (text[i] === '"') {
      const start = i;
      i++;
      while (i < text.length && text[i] !== '"') {
        if (text[i] === "\\") i++; // skip escaped char
        i++;
      }
      i++; // closing quote
      result += text.slice(start, i);
      continue;
    }
    // Single-line comment
    if (text[i] === "/" && text[i + 1] === "/") {
      while (i < text.length && text[i] !== "\n") i++;
      continue;
    }
    // Block comment
    if (text[i] === "/" && text[i + 1] === "*") {
      i += 2;
      while (i < text.length && !(text[i] === "*" && text[i + 1] === "/")) i++;
      i += 2;
      continue;
    }
    result += text[i];
    i++;
  }
  // Remove trailing commas before } or ]
  return result.replace(/,\s*([}\]])/g, "$1");
}
