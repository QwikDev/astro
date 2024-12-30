import fs, { cpSync } from "node:fs";
import path from "node:path";
import { copySync, ensureDirSync } from "fs-extra/esm";
import pkg from "../package.json";
import { ensureString } from "./console";
import { type Definition as BaseDefinition, Program } from "./core";
import { $, $pmInstall, $pmX } from "./process";
import {
  __dirname,
  clearDir,
  getPackageJson,
  getPackageManager,
  notEmptyDir,
  pmRunCommand,
  replacePackageJsonRunCommand,
  resolveAbsoluteDir,
  resolveRelativeDir,
  sanitizePackageName,
  updatePackageName
} from "./utils";

export type Definition = BaseDefinition & {
  destination: string;
  adapter: Adapter;
  force?: boolean;
  install?: boolean;
  biome?: boolean;
  git?: boolean;
  ci?: boolean;
  add?: boolean;
  dryRun?: boolean;
};

export type EnsureRequired<T, K extends keyof T> = Omit<T, K> & Required<Pick<T, K>>;
export type UserDefinition = Partial<Definition>;

export const defaultDefinition = {
  destination: ".",
  adapter: "none",
  force: undefined,
  install: undefined,
  biome: undefined,
  git: undefined,
  ci: undefined,
  yes: undefined,
  no: undefined,
  dryRun: undefined,
  add: undefined
} as const;

export type Adapter = "node" | "deno" | "none";

export type Input = Required<Omit<Definition, "yes" | "no">> & {
  outDir: string;
  packageName: string;
};

export function defineDefinition(definition: UserDefinition): Definition {
  return { ...defaultDefinition, ...definition };
}

export class Application extends Program<Definition, Input> {
  #packageManger = getPackageManager();

  configure(): void {
    this.strict()
      .interactive()
      .alias("h", "help")
      .useYes()
      .useNo()
      .conflict("add", "force")
      .command(
        "* [destination] [adapter]",
        "Create a new project powered by QwikDev/astro"
      )
      .argument("destination", {
        type: "string",
        default: defaultDefinition.destination,
        desc: "Directory of the project"
      })
      .argument("adapter", {
        type: "string",
        default: defaultDefinition.adapter,
        desc: "Server adapter",
        choices: ["deno", "node", "none"]
      })
      .option("add", {
        alias: "a",
        type: "boolean",
        default: defaultDefinition.add,
        desc: "Add QwikDev/astro to existing project"
      })
      .option("force", {
        alias: "f",
        type: "boolean",
        default: defaultDefinition.force,
        desc: "Overwrite target directory if it exists"
      })
      .option("install", {
        alias: "i",
        type: "boolean",
        default: defaultDefinition.install,
        desc: "Install dependencies"
      })
      .option("biome", {
        type: "boolean",
        default: defaultDefinition.biome,
        desc: "Prefer Biome to ESLint/Prettier"
      })
      .option("git", {
        type: "boolean",
        default: defaultDefinition.git,
        desc: "Initialize Git repository"
      })
      .option("ci", {
        type: "boolean",
        default: defaultDefinition.ci,
        desc: "Add CI workflow"
      })
      .option("dryRun", {
        type: "boolean",
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
      .usage("npm create @qwikdev/astro [destination] [adapter] [...options]");
  }

  parse(args: string[]): Definition {
    return defineDefinition(super.parse(args));
  }

  validate(definition: Definition): Input {
    return {
      destination: definition.destination,
      adapter: definition.adapter,
      force:
        definition.force ?? (definition.add ? false : !!definition.yes && !definition.no),
      add: !!definition.add,
      biome: definition.biome ?? (!!definition.yes && !definition.no),
      install: definition.install ?? (!!definition.yes && !definition.no),
      ci: definition.ci ?? (!!definition.yes && !definition.no),
      git: definition.git ?? (!!definition.yes && !definition.no),
      dryRun: !!definition.dryRun,
      outDir: resolveAbsoluteDir(definition.destination),
      packageName: sanitizePackageName(definition.destination)
    };
  }

  async interact(definition: Definition): Promise<Input> {
    const destination =
      definition.destination === defaultDefinition.destination
        ? await this.scanString(
            `Where would you like to create your new project? ${this.gray(
              `(Use '.' or 'qwik-astro-app' for current directory)`
            )}`,
            definition.destination
          )
        : definition.destination;

    let packageName = sanitizePackageName(destination);
    const outDir = resolveAbsoluteDir(destination.trim());
    const exists = notEmptyDir(outDir);

    const add =
      definition.add === undefined
        ? exists &&
          !!(await this.scanBoolean(
            definition,
            "Do you want to add @QwikDev/astro to your existing project?"
          ))
        : definition.add;

    const force =
      definition.force === undefined
        ? exists &&
          !add &&
          !!(await this.scanBoolean(
            definition,
            `Directory "./${resolveRelativeDir(
              outDir
            )}" already exists and is not empty. What would you like to overwrite it?`
          ))
        : false;

    let adapter: Adapter;

    if ((!add || force) && definition.adapter === defaultDefinition.adapter) {
      const adapterInput =
        ((await this.scanBoolean(
          definition,
          "Would you like to use a server adapter?",
          false
        )) &&
          (await this.scanChoice(
            "Which adapter do you prefer?",
            [
              {
                value: "node",
                label: "Node"
              },
              {
                value: "deno",
                label: "Deno"
              },
              {
                value: "none",
                label: "None"
              }
            ],
            definition.adapter
          ))) ||
        "none";

      ensureString(adapterInput, (v): v is Adapter =>
        ["none", "node", "deno"].includes(v)
      );

      adapter = adapterInput;
    } else {
      adapter = definition.adapter;
    }

    const biome =
      !add && definition.biome === undefined
        ? !!(await this.scanBoolean(
            definition,
            "Would you prefer Biome over ESLint/Prettier?"
          ))
        : !!definition.biome;

    const ci =
      definition.ci === undefined
        ? !!(await this.scanBoolean(definition, "Would you like to add CI workflow?"))
        : definition.ci;

    const install =
      definition.install === undefined
        ? !!(await this.scanBoolean(
            definition,
            `Would you like to install ${this.#packageManger} dependencies?`
          ))
        : definition.install;

    const git =
      definition.git === undefined
        ? !!(await this.scanBoolean(definition, "Would you like to initialize Git?"))
        : definition.git;

    const dryRun = !!definition.dryRun;

    packageName = definition.yes
      ? packageName
      : await this.scanString(
          "What should be the name of this package?",
          exists && !force ? (getPackageJson(outDir).name ?? packageName) : packageName
        );

    return {
      destination,
      adapter,
      biome,
      ci,
      install,
      git,
      add,
      force,
      outDir,
      packageName,
      dryRun
    };
  }

  async execute(input: Input): Promise<number> {
    try {
      const ranInstall = await this.start(input);
      this.updatePackageJson(input);
      this.runCI(input);
      await this.runGitInit(input);
      this.end(input, ranInstall);
      return 0;
    } catch (err) {
      console.error("An error occurred during QwikDev/astro project creation:", err);
      return 1;
    }
  }

  async runAdd(input: Input) {
    this.info("Adding @QwikDev/astro...");
    try {
      await $pmX("astro add @qwikdev/astro", input.outDir);
    } catch (e: any) {
      this.panic(`${e.message ?? e}: . Please try it manually.`);
    }
  }

  async runCreate(input: Input) {
    const outDir = input.outDir;

    if (notEmptyDir(outDir)) {
      if (input.force) {
        if (!input.dryRun) {
          await clearDir(outDir);
        }
        this.info(`Directory "${outDir}" successfully emptied 🗑️`);
      } else {
        this.error(`Directory "${outDir}" already exists.`);
        this.info(
          `Please either remove this directory, choose another location or run the command again with '--force | -f' flag.`
        );
        this.cancel();
        process.exit(1);
      }
    }

    let starterKit = input.adapter;

    if (input.biome) {
      starterKit += "-biome";
    }

    const templatePath = path.join(__dirname, "..", "stubs", "templates", starterKit);

    this.step(`Creating new project in ${this.bgBlue(` ${outDir} `)} ... 🐇`);
    this.copyTemplate(input, templatePath);
    this.copyGitignore(input);
  }

  async start(input: Input): Promise<boolean> {
    this.intro(`Let's create a ${this.bgBlue(" QwikDev/astro App ")} ✨`);

    let ranInstall: boolean;

    if (input.add) {
      ranInstall = await this.runInstall(input);
      await this.runAdd(input);
    } else {
      await this.runCreate(input);
      ranInstall = await this.runInstall(input);
    }

    return ranInstall;
  }

  end(input: Input, ranInstall: boolean): void {
    const outDir = input.outDir;
    const isCwdDir = process.cwd() === outDir;
    const relativeProjectPath = resolveRelativeDir(outDir);
    const outString = [];

    if (isCwdDir) {
      outString.push(`🦄 ${this.bgMagenta(" Success! ")}`);
    } else {
      outString.push(
        `🦄 ${this.bgMagenta(" Success! ")} ${this.cyan(
          "Project created in"
        )} ${this.bold(this.magenta(relativeProjectPath))} ${this.cyan("directory")}`
      );
    }
    outString.push("");

    outString.push(`🐰 ${this.cyan("Next steps:")}`);
    if (!isCwdDir) {
      outString.push(`   cd ${relativeProjectPath}`);
    }
    if (!ranInstall) {
      outString.push(`   ${getPackageManager()} install`);
    }
    outString.push(`   ${getPackageManager()} start`);

    this.note(outString.join("\n"), "Ready to start 🚀");

    this.outro("Happy coding! 💻🎉");
  }

  updatePackageJson(input: Input): void {
    const { outDir, packageName } = input;

    updatePackageName(packageName as string, outDir);
    this.info(`Updated package name to "${packageName}" 📦️`);

    if (getPackageManager() !== "npm") {
      this.info(`Replacing 'npm run' by '${pmRunCommand()}' in package.json...`);
      replacePackageJsonRunCommand(outDir);
    }
  }

  runCI(input: Input): void {
    if (input.ci) {
      this.step("Adding CI workflow...");

      if (!input.dryRun) {
        const starterCIPath = path.join(
          __dirname,
          "..",
          "stubs",
          "workflows",
          `${
            ["npm", "yarn", "pnpm", "bun"].includes(getPackageManager())
              ? getPackageManager()
              : "npm"
          }-ci.yml`
        );
        const projectCIPath = path.join(input.outDir, ".github", "workflows", "ci.yml");
        cpSync(starterCIPath, projectCIPath, { force: true });
      }
    }
  }

  async runInstall(definition: Definition): Promise<boolean> {
    let ranInstall = false;
    if (definition.install) {
      this.step("Installing dependencies...");
      if (!definition.dryRun) {
        await $pmInstall(definition.destination);
      }
      ranInstall = true;
    }

    return ranInstall;
  }

  async runGitInit(input: Input): Promise<void> {
    if (input.git) {
      const s = this.spinner();

      const outDir = input.outDir;

      if (fs.existsSync(path.join(outDir, ".git"))) {
        this.info("Git has already been initialized before. Skipping...");
      } else {
        s.start("Git initializing...");

        try {
          if (!input.dryRun) {
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
          this.error(
            this.red(
              "Git failed to initialize. You can do this manually by running: git init"
            )
          );
        }
      }
    }
  }

  copyGitignore(input: Input) {
    this.step("Copying `.gitignore` file...");

    if (!input.dryRun) {
      const gitignore = path.join(__dirname, "..", "stubs", "gitignore");
      const dotGitignore = path.join(input.outDir, ".gitignore");
      cpSync(gitignore, dotGitignore, { force: true });
    }
  }

  copyTemplate(input: Input, templatePath: string): void {
    if (!input.dryRun) {
      const outDir = input.outDir;
      try {
        ensureDirSync(outDir);
        copySync(templatePath, outDir);
      } catch (error) {
        this.error(this.red(`Template copy failed: ${error}`));
      }
    }
  }
}

export function app(name = pkg.name, version = pkg.version): Application {
  return new Application(name, version);
}

export default app();
