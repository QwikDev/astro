#!/usr/bin/env node

import { type ChildProcess, exec, spawn } from "node:child_process";
import { cpSync, existsSync, mkdirSync } from "node:fs";
import fs from "node:fs";
import os from "node:os";
import path, { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  cancel,
  confirm,
  intro,
  isCancel,
  log,
  outro,
  select,
  spinner,
  text
} from "@clack/prompts";
import { gray, red } from "kleur/colors";
import detectPackageManager from "which-pm-runs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export function resolveRelativeDir(dir: string) {
  return dir.startsWith("~/") ? resolve(os.homedir(), dir) : resolve(process.cwd(), dir);
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

export const $pm = async (
  args: string | string[],
  cwd = process.cwd(),
  env = process.env
) => {
  const packageManager = getPackageManager();
  args = Array.isArray(args) ? args : [args];

  return new Promise((resolve, reject) => {
    const child = spawn(packageManager, args, {
      cwd,
      stdio: "inherit",
      env
    });

    child.on("close", (code) => {
      if (code !== 0) {
        reject({ command: `${packageManager} ${args.join(" ")}` });
        return;
      }
      resolve(true);
    });
  });
};

export const installDependencies = async (cwd: string) => {
  await $pm("install", cwd);
};

const createProject = async () => {
  try {
    intro("QwikDev/astro project creation");

    const packageManager = getPackageManager();

    const defaultProjectName = "./qwik-astro-app";
    const projectNameAnswer = await text({
      message: `Where would you like to create your new project? ${gray(
        `(Use '.' or './' for current directory)`
      )}`,
      placeholder: defaultProjectName,
      validate(value) {
        if (value.length === 0) {
          return "Value is required!";
        }
      }
    });

    if (typeof projectNameAnswer === "symbol") {
      cancel("Operation canceled.");
      return process.exit(0);
    }

    if (isCancel([projectNameAnswer, packageManager])) {
      cancel("Operation canceled.");
      process.exit(0);
    }

    const adapter = await select({
      message: "Which adapter do you prefer?",
      options: [
        {
          value: "node",
          label: "Node"
        },
        {
          value: "deno",
          label: "Deno"
        }
      ]
    });

    const favoriteLinterFormatter = await select({
      message: "What is your favorite linter/formatter?",
      options: [
        {
          value: "0",
          label: "ESLint/Prettier"
        },
        {
          value: "1",
          label: "Biome"
        }
      ]
    });

    log.step("Creating project directories and copying files...");

    const kit = `${adapter}-${
      favoriteLinterFormatter === "0" ? "eslint+prettier" : "biome"
    }`;
    const templatePath = path.join(__dirname, "..", "stubs", "templates", kit);
    const outDir: string = resolveRelativeDir(projectNameAnswer.trim());

    if (!existsSync(outDir)) {
      mkdirSync(outDir, { recursive: true });
    }
    cpSync(templatePath, outDir, { recursive: true });

    const addCIWorkflow = await confirm({
      message: "Would you like to add CI workflow?",
      initialValue: true
    });

    if (addCIWorkflow) {
      const starterCIPath = join(
        __dirname,
        "..",
        "stubs",
        ".github",
        "workflows",
        "ci.yml"
      );
      const projectCIPath = join(outDir, ".github", "workflows", "ci.yml");
      cpSync(starterCIPath, projectCIPath, { force: true });
    }

    const runDepInstallAnswer = await confirm({
      message: `Would you like to install ${packageManager} dependencies?`,
      initialValue: true
    });

    const gitInitAnswer = await confirm({
      message: "Initialize a new git repository?",
      initialValue: true
    });

    if (gitInitAnswer) {
      const s = spinner();

      if (fs.existsSync(join(outDir, ".git"))) {
        log.info("Git has already been initialized before. Skipping...");
      } else {
        s.start("Git initializing...");

        try {
          const res = [];
          res.push(await $("git", ["init"], outDir).install);
          res.push(await $("git", ["add", "-A"], outDir).install);
          res.push(await $("git", ["commit", "-m", "Initial commit 🎉"], outDir).install);

          if (res.some((r) => r === false)) {
            throw "";
          }

          s.stop("Git initialized ✨");
        } catch (e) {
          s.stop("Git failed to initialize");
          log.error(
            red("Git failed to initialize. You can do this manually by running: git init")
          );
        }
      }
    }

    if (typeof runDepInstallAnswer !== "symbol" && runDepInstallAnswer) {
      log.step("Installing dependencies...");
      await installDependencies(projectNameAnswer);
    }

    outro("QwikDev/astro project created successfully! 🍻");
  } catch (err) {
    console.error("An error occurred during QwikDev/astro project creation:", err);
    process.exit(1);
  }
};

async function main() {
  await createProject();
}

main().catch(console.error);
