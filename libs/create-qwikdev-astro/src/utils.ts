import { type ChildProcess, exec, spawn } from "node:child_process";
import fs, { statSync, existsSync, mkdirSync, readdirSync, copyFileSync } from "node:fs";
import os from "node:os";
import path, { join, resolve, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { confirm, isCancel, log, select, text } from "@clack/prompts";
import { gray, green, red, reset, white } from "kleur/colors";
import which from "which";
import detectPackageManager from "which-pm-runs";

export const __filename = getModuleFilename();
export const __dirname = path.dirname(__filename);

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

export function isHome(dir: string): boolean {
  return dir.startsWith("~/");
}

export function resolveAbsoluteDir(dir: string) {
  return isHome(dir) ? resolve(os.homedir(), dir) : resolve(process.cwd(), dir);
}

export function resolveRelativeDir(dir: string) {
  return isHome(dir) ? relative(os.homedir(), dir) : relative(process.cwd(), dir);
}

export function $(cmd: string, args: string[], cwd: string) {
  let child: ChildProcess;

  const install = new Promise<boolean>((resolve) => {
    try {
      child = spawn(cmd, args, {
        cwd,
        stdio: "ignore"
      });

      child.on("error", (e) => {
        if (e) {
          log.error(`${red(String(e.message || e))}\n\n`);
        }
        resolve(false);
      });

      child.on("close", (code) => {
        resolve(code === 0);
      });
    } catch (e) {
      resolve(false);
    }
  });

  const abort = async () => {
    if (child) {
      child.kill("SIGINT");
    }
  };

  return { abort, install };
}

// Used from https://github.com/sindresorhus/is-unicode-supported/blob/main/index.js
export function isUnicodeSupported() {
  if (process.platform !== "win32") {
    return process.env.TERM !== "linux"; // Linux console (kernel)
  }

  return (
    Boolean(process.env.CI) ||
    Boolean(process.env.WT_SESSION) || // Windows Terminal
    Boolean(process.env.TERMINUS_SUBLIME) || // Terminus (<0.2.27)
    process.env.ConEmuTask === "{cmd::Cmder}" || // ConEmu and cmder
    process.env.TERM_PROGRAM === "Terminus-Sublime" ||
    process.env.TERM_PROGRAM === "vscode" ||
    process.env.TERM === "xterm-256color" ||
    process.env.TERM === "alacritty" ||
    process.env.TERMINAL_EMULATOR === "JetBrains-JediTerm"
  );
}

// Used from https://github.com/natemoo-re/clack/blob/main/packages/prompts/src/index.ts
const unicode = isUnicodeSupported();
const s = (c: string, fallback: string) => (unicode ? c : fallback);
const S_BAR = s("│", "|");
const S_BAR_H = s("─", "-");
const S_CORNER_TOP_RIGHT = s("╮", "+");
const S_CONNECT_LEFT = s("├", "+");
const S_CORNER_BOTTOM_RIGHT = s("╯", "+");
const S_STEP_SUBMIT = s("◇", "o");

function ansiRegex() {
  const pattern = [
    "[\\u001B\\u009B][[\\]()#;?]*(?:(?:(?:(?:;[-a-zA-Z\\d\\/#&.:=?%@~_]+)*|[a-zA-Z\\d]+(?:;[-a-zA-Z\\d\\/#&.:=?%@~_]*)*)?\\u0007)",
    "(?:(?:\\d{1,4}(?:;\\d{0,4})*)?[\\dA-PR-TZcf-nq-uy=><~]))"
  ].join("|");

  return new RegExp(pattern, "g");
}

// Used from https://github.com/QwikDev/qwik/blob/main/packages/qwik/src/cli/utils/utils.ts
const strip = (str: string) => str.replace(ansiRegex(), "");
export const note = (message = "", title = "") => {
  const lines = `\n${message}\n`.split("\n");
  const titleLen = strip(title).length;
  const len =
    Math.max(
      lines.reduce((sum, ln) => {
        ln = strip(ln);
        return ln.length > sum ? ln.length : sum;
      }, 0),
      titleLen
    ) + 2;
  const msg = lines
    .map(
      (ln) =>
        `${gray(S_BAR)}  ${white(ln)}${" ".repeat(len - strip(ln).length)}${gray(S_BAR)}`
    )
    .join("\n");
  process.stdout.write(
    `${gray(S_BAR)}\n${green(S_STEP_SUBMIT)}  ${reset(title)} ${gray(
      S_BAR_H.repeat(Math.max(len - titleLen - 1, 1)) + S_CORNER_TOP_RIGHT
    )}\n${msg}\n${gray(
      S_CONNECT_LEFT + S_BAR_H.repeat(len + 2) + S_CORNER_BOTTOM_RIGHT
    )}\n`
  );
};

// Used from https://github.com/QwikDev/qwik/blob/main/packages/qwik/src/cli/utils/utils.ts
export function panic(msg: string): never {
  console.error(`\n❌ ${red(msg)}\n`);
  process.exit(1);
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

export const isPackageManagerInstalled = (packageManager: string) => {
  return new Promise((resolve) => {
    exec(`${packageManager} --version`, (error, _, stderr) => {
      resolve(!(error || stderr));
    });
  });
};

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

export function updatePackageName(newName: string, dir = __dirname): void {
  const packageJsonPath = getPackageJsonPath(dir);
  const packageJson = JSON.parse(fileGetContents(packageJsonPath));
  const cleanedName = validatePackageName(newName);

  packageJson.name = cleanedName;
  filePutContents(packageJsonPath, JSON.stringify(packageJson, null, 2));
}

export const $pm = async (
  args: string | string[],
  cwd = process.cwd(),
  env = process.env
) => {
  const packageManager = getPackageManager();
  args = Array.isArray(args) ? args : [args];
  if (["exec", "dlx"].includes(args[0])) {
    switch (packageManager) {
      case "pnpm":
      case "yarn":
        break;
      case "bun":
      case "npm": {
        args = ["x", ...args.slice(1)];
        break;
      }
      default: {
        args = ["run", ...args.slice(1)];
        break;
      }
    }
  }

  const packageManagerPath = await which(packageManager);
  const command = `${packageManagerPath} ${args.join(" ")}`;

  return new Promise((resolve, reject) => {
    const child = spawn(packageManagerPath, args, {
      cwd,
      stdio: "inherit",
      env
    });

    child.on("close", (code) => {
      if (code !== 0) {
        reject({ command });
        return;
      }
      resolve(true);
    });
  });
};

export const $pmInstall = async (cwd: string) => {
  await $pm("install", cwd);
};

export const $pmRun = async (script: string, cwd: string) => {
  await $pm(["run", ...script.split(/\s+/)], cwd);
};

export const $pmExec = async (command: string, cwd: string) => {
  await $pm(["exec", ...command.split(/\s+/)], cwd);
};

export const $pmDlx = async (binary: string, cwd: string) => {
  await $pm(["dlx", ...binary.split(/\s+/)], cwd);
};

export const $pmX = async (executable: string, cwd: string) => {
  if (["pnpm", "yarn"].includes(getPackageManager())) {
    try {
      await $pmExec(executable, cwd);
    } catch (e: any) {
      await $pmDlx(executable, cwd);
    }
  } else {
    await $pmDlx(executable, cwd);
  }
};

export async function scanString(
  message: string,
  initialValue?: string,
  it?: boolean,
  positional = false
): Promise<string> {
  const input = !it
    ? initialValue
    : (await text({
        message,
        placeholder: initialValue
      })) || initialValue;

  ensureString(input, positional);

  return input;
}

export async function scanChoice(
  message: string,
  options: { value: string; label: string }[],
  initialValue?: string,
  it?: boolean,
  positional = false
): Promise<string> {
  const input = !it
    ? initialValue
    : (await select({
        message,
        options
      })) || initialValue;

  ensureString(input, positional);

  return input;
}

export async function scanBoolean(
  message: string,
  initialValue?: boolean,
  it?: boolean,
  yes?: boolean,
  no?: boolean,
  positional = false
): Promise<boolean> {
  const input =
    no && !initialValue
      ? false
      : (yes && initialValue !== false) ||
        initialValue ||
        (it &&
          (await confirm({
            message,
            initialValue
          })));

  ensureBoolean(input, positional);

  return input;
}

export function ensureString<T extends string>(
  input: any,
  positional = false,
  validate?: (v: string) => v is T
): asserts input is T {
  ensure(input, validate ?? isString, positional);
}

export function ensureNumber<T extends number>(
  input: any,
  positional = false,
  validate?: (v: number) => v is T
): asserts input is T {
  ensure(input, validate ?? isNumber, positional);
}

export function ensureBoolean(input: any, positional = false): asserts input is boolean {
  ensure(input, isBoolean, positional);
}

export function ensureTrue(input: any): asserts input is true {
  ensure(input, (v) => v === true);
}

export function ensureFalse(input: any): asserts input is false {
  ensure(input, (v) => v === false);
}

export function ensure<T, U>(
  input: T,
  validate: (v: T) => U,
  positional = false
): asserts input is T {
  if (isCanceled(input, positional)) {
    panic("Operation canceled.");
  }

  if (!validate(input)) {
    panic("Invalid input.");
  }
}

export function isString(input: any): input is string {
  return typeof input === "string" || input instanceof String;
}

export function isNumber(input: any): input is number {
  return typeof input === "number" && !Number.isNaN(input);
}

export function isBoolean(input: any): input is boolean {
  return typeof input === "boolean";
}

export function isCanceled(input: any, positional = false): boolean {
  return (
    typeof input === "symbol" ||
    isCancel(positional ? [input, getPackageManager()] : input)
  );
}
