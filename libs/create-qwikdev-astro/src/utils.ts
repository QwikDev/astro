import fs, { readdirSync, statSync } from "node:fs";
import os from "node:os";
import path, { join, resolve, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { copySync, ensureDirSync, pathExistsSync } from "fs-extra/esm";
import detectPackageManager from "which-pm-runs";

export const __filename = getModuleFilename();
export const __dirname = path.dirname(__filename);

export function safeCopy(source: string, target: string): void {
  const files = readdirSync(source);

  for (const file of files) {
    const sourcePath = join(source, file);
    const targetPath = join(target, file);

    if (statSync(sourcePath).isDirectory()) {
      ensureDirSync(targetPath);
      safeCopy(sourcePath, targetPath);
    } else if (!pathExistsSync(targetPath)) {
      copySync(sourcePath, targetPath);
    } else if (file.endsWith(".json")) {
      deepMergeJsonFile(targetPath, sourcePath, true);
    } else if (file.startsWith(".") && file.endsWith("ignore")) {
      mergeDotIgnoreFiles(targetPath, sourcePath, true);
    }
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

export function getPackageManager() {
  return detectPackageManager()?.name || "npm";
}

export function pmRunCommand(): string {
  const pm = getPackageManager();
  if (pm === "npm" || pm === "bun") {
    return `${pm} run`;
  }
  return pm;
}

export function getPackageJsonPath(dir = __dirname): string {
  return join(dir, "package.json");
}

function packageJsonReplace(dir: string, search: string | RegExp, replace: string) {
  fileReplaceContents(getPackageJsonPath(dir), search, replace);
}

export function replacePackageJsonRunCommand(dir: string) {
  packageJsonReplace(dir, /npm run/g, pmRunCommand());
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
