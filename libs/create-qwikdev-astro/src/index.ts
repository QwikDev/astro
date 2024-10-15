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
import {
  $,
  __dirname,
  __filename,
  clearDir,
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
  updatePackageName
} from "./utils";

export type Config = {
  project: string;
  adapter: "deno" | "node" | null;
  force: boolean;
  install: boolean;
  biome: boolean;
  git: boolean;
  ci: boolean;
  it: boolean;
  yes: boolean;
  no: boolean;
  dryRun: boolean;
};

export type UserConfig = Partial<Config>;

export const defaultConfig = {
  project: "./qwik-astro-astro",
  adapter: null,
  force: false,
  install: true,
  biome: true,
  git: false,
  ci: false,
  it: false,
  yes: false,
  no: false,
  dryRun: false
} as const;

export function defineConfig(config: UserConfig): Config {
  return { ...defaultConfig, ...config };
}

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
  const config = defineConfig(options);
  const defaultProject = config.project;

  try {
    intro(`Let's create a ${bgBlue(" QwikDev/astro App ")} ✨`);

    const packageManager = getPackageManager();

    const projectAnswer =
      config.project !== defaultProject || !config.it
        ? config.project
        : (await text({
            message: `Where would you like to create your new project? ${gray(
              `(Use '.' or './' for current directory)`
            )}`,
            placeholder: defaultProject
          })) || defaultProject;

    if (typeof projectAnswer === "symbol" || isCancel([projectAnswer, packageManager])) {
      panicCanceled();
    }

    const adapter =
      config.adapter ||
      (config.it &&
        (await confirm({
          message: "Would you like to use a server adapter?",
          initialValue: false
        })) &&
        (await select({
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
        }))) ||
      "default";

    if (typeof adapter === "symbol" || isCancel(adapter)) {
      panicCanceled();
    }

    let starterKit = adapter as string;

    const preferBiome =
      config.no && !config.biome
        ? false
        : (config.yes && config.biome !== false) ||
          config.biome ||
          (config.it &&
            (await confirm({
              message: "Would you prefer Biome over ESLint/Prettier?",
              initialValue: config.biome
            })));

    if (preferBiome) {
      starterKit += "-biome";
    }

    const templatePath = path.join(__dirname, "..", "stubs", "templates", starterKit);
    const outDir: string = resolveAbsoluteDir((projectAnswer as string).trim());

    log.step(`Creating new project in ${bgBlue(` ${outDir} `)} ... 🐇`);

    if (fs.existsSync(outDir) && fs.readdirSync(outDir).length > 0) {
      const force =
        config.no && !config.force
          ? false
          : (config.yes && config.force !== false) ||
            config.force ||
            (config.it &&
              (await confirm({
                message: `Directory "./${resolveRelativeDir(
                  outDir
                )}" already exists and is not empty. What would you like to overwrite it?`,
                initialValue: config.force
              })));
      if (force) {
        if (!config.dryRun) {
          await clearDir(outDir);
        }
      } else {
        log.error(`Directory "${outDir}" already exists.`);
        log.info(
          `Please either remove this directory, choose another location or run the command again with '--force | -f' flag.`
        );
        cancel();
        process.exit(1);
      }
    }

    if (!config.dryRun) {
      if (!existsSync(outDir)) {
        mkdirSync(outDir, { recursive: true });
      }
      cpSync(templatePath, outDir, { recursive: true });
    }

    const defaultPackageName = sanitizePackageName(projectAnswer as string);
    const packageName = config.it
      ? await text({
          message: "What should be the name of this package?",
          defaultValue: defaultPackageName,
          placeholder: defaultPackageName
        })
      : defaultPackageName;

    if (typeof packageName === "symbol" || isCancel(packageName)) {
      panicCanceled();
    }

    updatePackageName(packageName as string, outDir);
    log.info(`Updated package name to "${packageName as string}" 📦️`);

    if (packageManager !== "npm") {
      log.info(`Replacing 'npm run' by '${pmRunCommand()}' in package.json...`);
      replacePackageJsonRunCommand(outDir);
    }

    const addCIWorkflow =
      config.no && !config.ci
        ? false
        : (config.yes && config.ci !== false) ||
          config.ci ||
          (config.it &&
            (await confirm({
              message: "Would you like to add CI workflow?",
              initialValue: config.ci
            })));

    if (addCIWorkflow && !config.dryRun) {
      const starterCIPath = join(
        __dirname,
        "..",
        "stubs",
        "workflows",
        `${
          ["npm", "yarn", "pnpm", "bun"].includes(packageManager) ? packageManager : "npm"
        }-ci.yml`
      );
      const projectCIPath = join(outDir, ".github", "workflows", "ci.yml");
      cpSync(starterCIPath, projectCIPath, { force: true });
    }

    const runInstall =
      config.no && !config.install
        ? false
        : (config.yes && config.install !== false) ||
          config.install ||
          (config.it &&
            (await confirm({
              message: `Would you like to install ${packageManager} dependencies?`,
              initialValue: config.install
            })));

    let ranInstall = false;
    if (typeof runInstall !== "symbol" && runInstall) {
      log.step("Installing dependencies...");
      if (!config.dryRun) {
        await installDependencies(projectAnswer as string);
      }
      ranInstall = true;
    }

    const initGit =
      config.no && !config.git
        ? false
        : (config.yes && config.git !== false) ||
          config.git ||
          (config.it &&
            (await confirm({
              message: "Initialize a new git repository?",
              initialValue: config.git
            })));

    if (initGit) {
      const s = spinner();

      if (fs.existsSync(join(outDir, ".git"))) {
        log.info("Git has already been initialized before. Skipping...");
      } else {
        s.start("Git initializing...");

        try {
          if (!config.dryRun) {
            const res = [];
            res.push(await $("git", ["init"], outDir).install);
            res.push(await $("git", ["add", "-A"], outDir).install);
            res.push(
              await $("git", ["commit", "-m", "Initial commit 🎉"], outDir).install
            );

            if (res.some((r) => r === false)) {
              throw "";
            }
          }

          s.stop("Git initialized 🎲");
        } catch (e) {
          s.stop("Git failed to initialize");
          log.error(
            red("Git failed to initialize. You can do this manually by running: git init")
          );
        }
      }
    }

    const isCwdDir = process.cwd() === outDir;
    const relativeProjectPath = resolveRelativeDir(outDir);
    const outString = [];

    if (isCwdDir) {
      outString.push(`🦄 ${bgMagenta(" Success! ")}`);
    } else {
      outString.push(
        `🦄 ${bgMagenta(" Success! ")} ${cyan("Project created in")} ${bold(
          magenta(relativeProjectPath)
        )} ${cyan("directory")}`
      );
    }
    outString.push("");

    outString.push(`🐰 ${cyan("Next steps:")}`);
    if (!isCwdDir) {
      outString.push(`   cd ${relativeProjectPath}`);
    }
    if (!ranInstall) {
      outString.push(`   ${packageManager} install`);
    }
    outString.push(`   ${packageManager} start`);

    note(outString.join("\n"), "Ready to start 🚀");

    outro("Happy coding! 💻🎉");
  } catch (err) {
    console.error("An error occurred during QwikDev/astro project creation:", err);
    process.exit(1);
  }
}

/** @param args Pass here process.argv.slice(2) */
export async function runCreate(...args: string[]) {
  const projectConfig = parseArgs(args.length ? args : []);
  projectConfig.it = projectConfig.it || args.length === 0;

  createProject(projectConfig);
}

export default async function () {
  try {
    await runCreate(...process.argv.slice(2));
  } catch (err: any) {
    panic(err.message || err);
  }
}
