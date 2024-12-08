import pkg from "../package.json";
import { defaultConfig } from "./config";
import { Application } from "./core";
import { __dirname, panic } from "./utils";

const app: Application = new Application(pkg.name, pkg.version);

app
  .strict()
  .alias("h", "help")
  .yes()
  .no()
  .it()
  .dryRun()
  .command("* [project] [adapter]", "Create a new project powered by QwikDev/astro")
  .argument("project", {
    type: "string",
    default: defaultConfig.project,
    desc: "Directory of the project"
  })
  .argument("adapter", {
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
  .example("npm create @qwikdev/astro@latest", "Create a project with default options")
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

/** @param args Pass here process.argv */
export async function runCreate(...args: string[]) {
  app.run(args);
}

export default async function (args = process.argv) {
  try {
    await runCreate(...args);
  } catch (err: any) {
    panic(err.message || err);
  }
}
