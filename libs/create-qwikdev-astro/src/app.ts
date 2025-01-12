import fs, { cpSync } from "node:fs";
import path from "node:path";
import { copySync, ensureDirSync, pathExistsSync } from "fs-extra/esm";
import pkg from "../package.json";
import { ensureString } from "./console";
import { type Definition as BaseDefinition, Program } from "./core";
import { $, $pmCreate, $pmInstall, $pmX } from "./process";
import {
  __dirname,
  clearDir,
  getPackageJson,
  getPackageManager,
  mergeDotIgnoreFiles,
  notEmptyDir,
  pmRunCommand,
  replacePackageJsonRunCommand,
  resolveAbsoluteDir,
  resolveRelativeDir,
  safeCopy,
  sanitizePackageName,
  updatePackageName
} from "./utils";

export type Definition = BaseDefinition & {
  destination: string;
  adapter: Adapter;
  template?: string;
  add?: boolean;
  force?: boolean;
  copy?: boolean;
  biome?: boolean;
  install?: boolean;
  git?: boolean;
  ci?: boolean;
  dryRun?: boolean;
};

export type EnsureRequired<T, K extends keyof T> = Omit<T, K> & Required<Pick<T, K>>;
export type UserDefinition = Partial<Definition>;

export const defaultDefinition = {
  destination: "./qwik-astro-app",
  adapter: "none",
  template: undefined,
  add: undefined,
  force: undefined,
  copy: undefined,
  biome: undefined,
  install: undefined,
  git: undefined,
  ci: undefined,
  yes: undefined,
  no: undefined,
  dryRun: undefined
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
      .argument("template", {
        alias: "t",
        type: "string",
        default: defaultDefinition.template,
        desc: "Start from an Astro template"
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
      .option("copy", {
        alias: "c",
        type: "boolean",
        default: defaultDefinition.copy,
        desc: "Copy files without overwriting"
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
      template: definition.template ?? "",
      add: !!definition.add,
      force:
        definition.force ?? (definition.add ? false : !!definition.yes && !definition.no),
      copy: !!definition.copy,
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
              `(Use './' for current directory)`
            )}`,
            definition.destination
          )
        : definition.destination;

    const outDir = resolveAbsoluteDir(destination.trim());
    const exists = notEmptyDir(outDir);

    const add = !!(definition.add === undefined && !definition.force
      ? exists &&
        (await this.scanBoolean(
          definition,
          "Do you want to add @QwikDev/astro to your existing project?"
        ))
      : definition.add);

    const force =
      definition.force === undefined
        ? exists &&
          !add &&
          !!(await this.scanBoolean(
            definition,
            `Directory "./${resolveRelativeDir(
              outDir
            )}" already exists and is not empty. Would you like to force the copy?`,
            false
          ))
        : definition.force;

    const copy =
      add || force
        ? definition.copy === undefined
          ? await this.scanBoolean(
              definition,
              "Copy template files safely (without overwriting existing files)?",
              !add
            )
          : false
        : !!definition.copy;

    const template: string =
      definition.template === undefined &&
      (await this.scanBoolean(
        definition,
        "Would you like to use the default template?",
        true
      ))
        ? (definition.template ?? "")
        : await this.scanString("What template would you like to use?", "");

    const ask = !exists || add || force;

    let adapter: Adapter;

    if (
      !template &&
      ask &&
      (!add || force) &&
      definition.adapter === defaultDefinition.adapter
    ) {
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

    const biome = !!(ask && !add && definition.biome === undefined
      ? await this.scanBoolean(definition, "Would you prefer Biome over ESLint/Prettier?")
      : definition.biome);

    const ci = !!(ask && definition.ci === undefined
      ? await this.scanBoolean(definition, "Would you like to add CI workflow?")
      : definition.ci);

    const install = !!(ask && definition.install === undefined
      ? await this.scanBoolean(
          definition,
          `Would you like to install ${this.#packageManger} dependencies?`
        )
      : definition.install);

    const git = !!(ask && definition.git === undefined
      ? await this.scanBoolean(definition, "Would you like to initialize Git?")
      : definition.git);

    const dryRun = !!definition.dryRun;

    let packageName =
      exists && (!force || copy)
        ? getPackageJson(outDir).name
        : sanitizePackageName(destination);

    packageName =
      !ask || definition.yes
        ? packageName
        : await this.scanString("What should be the name of this package?", packageName);

    return {
      destination,
      adapter,
      template,
      biome,
      ci,
      install,
      git,
      add,
      force,
      copy,
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
      if (!input.dryRun) {
        await $pmX("astro add @qwikdev/astro", input.outDir);
      }

      if (input.copy) {
        this.copyTemplate(input);
      }
    } catch (e: any) {
      this.panic(`${e.message ?? e}: . Please try it manually.`);
    }
  }

  async prepareDir(input: Input) {
    const outDir = input.outDir;

    if (notEmptyDir(outDir)) {
      if (input.force) {
        if (input.copy) {
          this.info(`Directory "${outDir}" already exists. Copy safely...🚚`);
        } else {
          if (!input.dryRun) {
            await clearDir(outDir);
          }
          this.info(`Directory "${outDir}" successfully emptied 🔥`);
        }
      } else {
        this.error(`Directory "${outDir}" already exists.`);
        this.info(
          `Please either remove this directory, choose another location or run the command again with '--force | -f' flag.`
        );
        this.cancel();
        process.exit(1);
      }
    }
  }

  async runCreate(input: Input) {
    await this.prepareDir(input);
    this.copyTemplate(input);
  }

  async runTemplate(input: Input) {
    const args = [
      "astro",
      input.destination,
      "--",
      "--skip-houston",
      "--template",
      input.template,
      "--add",
      "@qwikdev/astro",
      input.install ? "--install" : "--no-install",
      input.git ? "--git" : "--no-git"
    ];

    if (input.dryRun) {
      args.push("--dry-run");
    }

    await this.prepareDir(input);
    await $pmCreate(args.join(" "), process.cwd());

    this.copyTemplate(
      input,
      path.join(
        __dirname,
        "..",
        "stubs",
        "templates",
        `none${input.biome ? "-biome" : ""}`
      )
    );

    return this.runInstall(input);
  }

  async start(input: Input): Promise<boolean> {
    this.intro(
      `Let's create a ${this.bgBlue(" QwikDev")}${this.bgMagenta("Astro")} App ✨`
    );

    let ranInstall: boolean;

    if (input.template) {
      ranInstall = await this.runTemplate(input);
    } else if (input.add) {
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
      this.step("👷 Adding CI workflow...");

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

  async runInstall(input: Input): Promise<boolean> {
    let ranInstall = false;

    if (input.install) {
      this.step(`Installing${input.template ? " new " : " "}dependencies...`);

      if (!input.dryRun) {
        await $pmInstall(input.destination);
      }

      ranInstall = true;
    }

    return ranInstall;
  }

  async runGitInit(input: Input): Promise<void> {
    if (input.git) {
      const s = this.spinner();

      const outDir = input.outDir;
      const initialized = fs.existsSync(path.join(outDir, ".git"));
      if (initialized) {
        this.info("Git has already been initialized before.");
      }

      s.start(`${initialized ? "Adding New Changes to" : "Initializing"} Git...`);

      if (!input.dryRun) {
        const res = [];
        try {
          if (!initialized) {
            res.push(await $("git", ["init"], outDir).process);
          }
          res.push(await $("git", ["add", "-A"], outDir).process);
          res.push(
            await $(
              "git",
              [
                "commit",
                "-m",
                `${initialized ? "➕ Add @qwikdev/astro" : "Initial commit 🎉"}`
              ],
              outDir
            ).process
          );

          if (res.some((r) => r === false)) {
            throw "";
          }

          s.stop(`${initialized ? "Changes added to Git ✨" : "Git initialized 🎲"}`);
        } catch (e) {
          s.stop(`Git failed to ${initialized ? "add new changes" : "initialize"}`);
          if (!initialized) {
            this.error(
              this.red(
                "Git failed to initialize. You can do this manually by running: git init"
              )
            );
          }
        }
      }
    }
  }

  makeGitignore(input: Input) {
    const dotGitignore = path.join(input.outDir, ".gitignore");
    const exists = pathExistsSync(dotGitignore);

    this.step(`${exists ? "Merging" : "Copying"} \`.gitignore\` file... 🙈`);

    if (!input.dryRun) {
      const gitignore = path.join(__dirname, "..", "stubs", "gitignore");

      if (exists) {
        mergeDotIgnoreFiles(dotGitignore, gitignore, true);
      } else {
        cpSync(gitignore, dotGitignore, { force: true });
      }
    }
  }

  copyTemplate(input: Input, templatePath?: string): void {
    this.step(
      `${input.add || input.template ? "Copying template files into" : "Creating new project in"} ${this.bgBlue(` ${input.outDir} `)} ... 🐇`
    );

    if (!input.dryRun) {
      const outDir = input.outDir;
      try {
        ensureDirSync(outDir);

        if (!templatePath) {
          let starterKit = input.adapter;

          if (input.biome) {
            starterKit += "-biome";
          }

          templatePath = path.join(__dirname, "..", "stubs", "templates", starterKit);
        }

        input.template || input.copy
          ? safeCopy(templatePath, outDir)
          : copySync(templatePath, outDir);

        this.makeGitignore(input);
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
