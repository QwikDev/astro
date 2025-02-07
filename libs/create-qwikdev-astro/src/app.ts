import fs, { cpSync } from "node:fs";
import path from "node:path";
import { copySync, ensureDirSync, pathExistsSync } from "fs-extra/esm";
import pm from "panam";
import { $ } from "panam/process";
import pkg from "../package.json";
import { ensureString } from "./console";
import { type Definition as BaseDefinition, Program } from "./core";
import {
  __dirname,
  clearDir,
  getPackageJson,
  notEmptyDir,
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
        desc: "Use Git to save changes"
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

    const template: string =
      definition.template === undefined &&
      (await this.scanBoolean(
        definition,
        "Would you like to use the default template?",
        true
      ))
        ? await this.scanString("What template would you like to use?", "")
        : (definition.template ?? "");

    const useTemplate = !!template;

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
      !useTemplate && (add || force)
        ? definition.copy === undefined
          ? await this.scanBoolean(
              definition,
              "Copy template files safely (without overwriting existing files)?",
              !add
            )
          : false
        : !!definition.copy;

    const ask = !exists || add || force;

    let adapter: Adapter;

    if (
      !useTemplate &&
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
          `Would you like to install ${pm.name} dependencies?`
        )
      : definition.install);

    const git = !!(ask && definition.git === undefined
      ? await this.scanBoolean(
          definition,
          !exists || force
            ? "Would you like to initialize Git?"
            : "Would you like to save the changes with Git?"
        )
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
      await this.runGit(input);
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
        await pm.x("astro add @qwikdev/astro", { cwd: input.outDir });
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
      input.force ? "." : input.destination,
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

    const res = await pm.create(args.join(" "), { cwd: input.outDir });
    if (!res.status) {
      this.panic(`Template creation failed: ${res.error}`);
    }

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
      outString.push(`   ${pm.name} install`);
    }
    outString.push(`   ${pm.name} start`);

    this.note(outString.join("\n"), "Ready to start 🚀");

    this.outro("Happy coding! 💻🎉");
  }

  updatePackageJson(input: Input): void {
    const { outDir, packageName } = input;

    updatePackageName(packageName as string, outDir);
    this.info(`Updated package name to "${packageName}" 📦️`);

    if (!pm.isNpm()) {
      this.info(`Replacing 'npm run' by '${pm.runCommand()}' in package.json...`);
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
          `${pm.in(["npm", "yarn", "pnpm", "bun"]) ? pm.name : "npm"}-ci.yml`
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
        await pm.install({ cwd: input.outDir });
      }

      ranInstall = true;
    }

    return ranInstall;
  }

  async runGit(input: Input): Promise<void> {
    if (input.git) {
      const s = this.spinner();

      const outDir = input.outDir;
      const initialized = fs.existsSync(path.join(outDir, ".git"));
      const addChanges = initialized || input.add;
      if (initialized) {
        this.info("Git has already been initialized before.");
      }

      s.start(`${addChanges ? "Adding New Changes to" : "Initializing"} Git...`);

      if (!input.dryRun) {
        const res = [];
        try {
          if (!initialized) {
            res.push(await $("git", ["init"], { cwd: outDir }).result);
          }
          res.push(await $("git", ["add", "-A"], { cwd: outDir }).result);
          res.push(
            await $(
              "git",
              [
                "commit",
                "-m",
                `${addChanges ? "➕ Add @qwikdev/astro" : "Initial commit 🎉"}`
              ],
              { cwd: outDir }
            ).result
          );

          if (res.some((r) => r.status === false)) {
            throw "";
          }

          s.stop(`${addChanges ? "Changes added to Git ✨" : "Git initialized 🎲"}`);
        } catch (e) {
          s.stop(`Git failed to ${addChanges ? "add new changes" : "initialize"}`);
          if (!initialized) {
            this.error(
              "Git failed to initialize. You can do this manually by running: git init"
            );
          } else {
            this.error(
              "Git failed to add new changes. You can do this manually by running: git add -A && git commit"
            );
          }
        }
      }
    }
  }

  copyTools(input: Input) {
    for (const filename of [
      ...(input.biome
        ? ["biome.json", "tsconfig.biome.json"]
        : [
            ".eslintignore",
            ".eslintrc.cjs",
            ".prettierignore",
            "prettier.config.cjs",
            "tsconfig.json"
          ]),
      "gitignore",
      "README.md"
    ]) {
      let outfile = filename;

      if (filename === "gitignore") {
        outfile = ".gitignore";
      }
      if (filename.startsWith("tsconfig.")) {
        outfile = "tsconfig.json";
      }
      const outpath = path.join(input.outDir, outfile);
      const exists = pathExistsSync(outpath);
      if (filename.startsWith(".") && filename.endsWith("ignore")) {
        this.step(`${exists ? "Merging" : "Copying"} \`${outfile}\` file... 🙈`);
      }

      if (!input.dryRun) {
        const origin = path.join(__dirname, "..", "stubs", "tools", filename);
        safeCopy(origin, outpath);
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

        this.copyTools(input);
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
