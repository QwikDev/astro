import yargs from "yargs";
import { hideBin } from "yargs/helpers";
import { app } from "./app";
import { type UserConfig, defaultConfig } from "./config";
import { __dirname, panic } from "./utils";

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
  const projectConfig = parseArgs(hideBin(args));
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
