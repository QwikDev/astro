import { type ChildProcess, exec, spawn } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path, { join, resolve, relative } from "node:path";
import { fileURLToPath } from "node:url";
import which from "which";
import detectPackageManager from "which-pm-runs";
import { logError } from "./console";

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
          logError(String(e.message || e));
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
