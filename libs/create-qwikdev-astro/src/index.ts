import fs, { cpSync, existsSync, mkdirSync } from "node:fs";
import path, { join } from "node:path";
import process from "node:process";
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
import { bgBlue, bgMagenta, bold, cyan, gray, magenta, red } from "kleur/colors";
import yargs from "yargs";
import { app } from "./app";
import { type Adapter, type Config, type UserConfig, defaultConfig } from "./config";
import {
  $,
  __dirname,
  getPackageManager,
  installDependencies,
  note,
  panic,
  panicCanceled,
  pmRunCommand,
  replacePackageJsonRunCommand,
  resolveAbsoluteDir,
  resolveRelativeDir,
  sanitizePackageName,
  scanBoolean,
  scanString,
  updatePackageName
} from "./utils";

export function parseArgs(args: string[]): UserConfig {
  const parsedArgs = yargs(args)
    .strict()
    .command(
      "* <project> [adapter]",
      "Create a new project powered by QwikDev/astro",
      (yargs) => {
        return yargs
          .positional("project", {
            type: "string",
            default: defaultConfig.project,
            desc: "Directory of the project"
          })
          .positional("adapter", {
            type: "string",
            default: defaultConfig.adapter,
            desc: "Server adapter",
            choices: ["deno", "node"]
          })
          .option("force", {
            alias: "f",
            type: "boolean",
            default: defaultConfig.force,
            desc: "Overwrite target directory if it exists"
          })
          .option("install", {
            alias: "i",
            type: "boolean",
            default: defaultConfig.install,
            desc: "Install dependencies"
          })
          .option("biome", {
            type: "boolean",
            default: defaultConfig.biome,
            desc: "Prefer Biome to ESLint/Prettier"
          })
          .option("git", {
            type: "boolean",
            default: defaultConfig.git,
            desc: "Initialize Git repository"
          })
          .option("ci", {
            type: "boolean",
            default: defaultConfig.ci,
            desc: "Add CI workflow"
          })
          .option("yes", {
            alias: "y",
            default: defaultConfig.yes,
            type: "boolean",
            desc: "Skip all prompts by accepting defaults"
          })
          .option("no", {
            alias: "n",
            type: "boolean",
            default: defaultConfig.no,
            desc: "Skip all prompts by declining defaults"
          })
          .option("it", {
            type: "boolean",
            default: defaultConfig.it,
            desc: "Execute actions interactively"
          })
          .option("dryRun", {
            type: "boolean",
            default: defaultConfig.dryRun,
            desc: "Walk through steps without executing"
          })
          .example(
            "npm create @qwikdev/astro@latest",
            "Create a project with default options"
          )
          .example(
            "npm create @qwikdev/astro@latest ./qwik-astro-app",
            "Create a project in a specific directory"
          )
          .example(
            "npm create @qwikdev/astro@latest ./qwik-astro-app node",
            "Create a project using a server adapter"
          )
          .example(
            "npm create @qwikdev/astro@latest ./qwik-astro-app node --it",
            "Create a project in interactive command mode"
          )
          .usage("npm create @qwikdev/astro [project] [adapter] [...options]");
      }
    )
    .alias("h", "help").argv as unknown as UserConfig;

  return parsedArgs;
}

export async function createProject(options: UserConfig) {
  const project = app(options);
  project.run();
}

/** @param args Pass here process.argv.slice(2) */
export async function runCreate(...args: string[]) {
  const projectConfig = parseArgs(args.length ? args : []);
  projectConfig.it = projectConfig.it || args.length === 0;

  createProject(projectConfig);
}

export default async function (args: string[] = []) {
  try {
    await runCreate(...args);
  } catch (err: any) {
    panic(err.message || err);
  }
}
