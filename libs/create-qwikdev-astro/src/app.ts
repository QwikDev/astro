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
  getPackageManager,
  pmRunCommand,
  replacePackageJsonRunCommand,
  resolveAbsoluteDir,
  resolveRelativeDir,
  sanitizePackageName,
  updatePackageName
} from "./utils";

export type Definition = BaseDefinition & {
  destination: string;
  adapter?: Adapter;
  force?: boolean;
  install?: boolean;
  biome?: boolean;
  git?: boolean;
  ci?: boolean;
  add?: boolean;
};

export type UserDefinition = Partial<Definition>;

export const defaultDefinition = {
  destination: ".",
  adapter: undefined,
  force: undefined,
  install: undefined,
  biome: undefined,
  git: undefined,
  ci: undefined,
  it: undefined,
  yes: undefined,
  no: undefined,
  dryRun: undefined,
  add: undefined
} as const;

export type Adapter = "node" | "deno" | "default";

export function defineDefinition(definition: UserDefinition): Definition {
  return { ...defaultDefinition, ...definition };
}

export class Application extends Program<Definition> {
  #packageManger = getPackageManager();

  configure(): void {
    this.strict()
      .alias("h", "help")
      .yes()
      .no()
      .it()
      .dryRun()
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
        choices: ["deno", "node"]
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

  async scanDestination(definition: Definition): Promise<string> {
    return this.scanString(
      definition,
      `Where would you like to create your new project? ${this.gray(
        `(Use '.' or './' for current directory)`
      )}`,
      definition.destination
    );
  }

  async scanAdd(definition: Definition): Promise<boolean> {
    if (this.#outDir(definition.destination) === process.cwd()) {
      return await this.scanBoolean(
        definition,
        "Do you want to add @QwikDev/astro to your existing project?",
        definition.add
      );
    }

    return !!definition.add;
  }

  async scanAdapter(definition: Definition): Promise<Adapter> {
    const adapter =
      (definition.it &&
        (await this.scanBoolean(
          definition,
          "Would you like to use a server adapter?",
          false
        )) &&
        (await this.scanChoice(
          definition,
          "Which adapter do you prefer?",
          [
            {
              value: "node",
              label: "Node"
            },
            {
              value: "deno",
              label: "Deno"
            }
          ],
          definition.adapter
        ))) ||
      "default";

    ensureString<Adapter>(adapter);

    return adapter;
  }

  async scanPreferBiome(definition: Definition): Promise<boolean> {
    return this.scanBoolean(
      definition,
      "Would you prefer Biome over ESLint/Prettier?",
      definition.biome
    );
  }

  async scanForce(definition: Definition): Promise<boolean> {
    return this.scanBoolean(
      definition,
      `Directory "./${resolveRelativeDir(
        this.#outDir(definition.destination)
      )}" already exists and is not empty. What would you like to overwrite it?`,
      definition.force
    );
  }

  async scanCI(definition: Definition): Promise<boolean> {
    return this.scanBoolean(
      definition,
      "Would you like to add CI workflow?",
      definition.ci
    );
  }

  async scanInstall(definition: Definition): Promise<boolean> {
    return this.scanBoolean(
      definition,
      `Would you like to install ${this.#packageManger} dependencies?`,
      definition.install
    );
  }

  async scanGit(definition: Definition): Promise<boolean> {
    return this.scanBoolean(
      definition,
      "Would you like to initialize Git?",
      definition.git
    );
  }

  #outDir(destination: string): string {
    return resolveAbsoluteDir(destination.trim());
  }

  parse(args: string[]): Definition {
    return defineDefinition(super.parse(args));
  }

  async interact(definition: Definition): Promise<Required<Definition>> {
    if (
      !definition.destination ||
      definition.destination === defaultDefinition.destination
    ) {
      definition.destination = await this.scanDestination(definition);
    }

    if (definition.adapter === defaultDefinition.adapter) {
      definition.adapter = await this.scanAdapter(definition);
    }

    if (definition.force === defaultDefinition.force) {
      definition.force = await this.scanForce(definition);
    }

    if (definition.biome === defaultDefinition.biome) {
      definition.biome = await this.scanPreferBiome(definition);
    }

    if (definition.ci === defaultDefinition.ci) {
      definition.ci = await this.scanCI(definition);
    }

    if (definition.install === defaultDefinition.install) {
      definition.install = await this.scanInstall(definition);
    }

    if (definition.git === defaultDefinition.git) {
      definition.git = await this.scanGit(definition);
    }

    return definition as Required<Definition>;
  }

  async execute(definition: Definition): Promise<number> {
    try {
      await this.start(definition);
      await this.updatePackageJson(definition);
      await this.runCI(definition);
      const ranInstall = await this.runInstall(definition);
      await this.runGitInit(definition);
      this.end(definition, ranInstall);
      return 0;
    } catch (err) {
      console.error("An error occurred during QwikDev/astro project creation:", err);
      return 1;
    }
  }

  async add(definition: Definition) {
    this.info("Adding @QwikDev/astro...");
    try {
      await $pmX("astro add @qwikdev/astro", this.#outDir(definition.destination));
    } catch (e: any) {
      this.panic(`${e.message ?? e}: . Please try it manually.`);
    }
  }

  async create(definition: Definition) {
    let starterKit = definition.adapter ?? "default";

    if (definition.biome) {
      starterKit += "-biome";
    }

    const outDir = this.#outDir(definition.destination);

    if (fs.existsSync(outDir) && fs.readdirSync(outDir).length > 0) {
      if (definition.add) {
        await this.add(definition);
      } else if (definition.force) {
        if (!definition.dryRun) {
          await clearDir(outDir);

          const templatePath = path.join(
            __dirname,
            "..",
            "stubs",
            "templates",
            starterKit
          );

          this.step(`Creating new project in ${this.bgBlue(` ${outDir} `)} ... 🐇`);
          this.copyTemplate(definition, templatePath);
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

  async updatePackageJson(definition: Definition) {
    const defaultPackageName = sanitizePackageName(definition.destination);
    const packageName = await this.scanString(
      definition,
      "What should be the name of this package?",
      defaultPackageName
    );

    const outDir = this.#outDir(definition.destination);

    updatePackageName(packageName, outDir);
    this.info(`Updated package name to "${packageName}" 📦️`);

    if (getPackageManager() !== "npm") {
      this.info(`Replacing 'npm run' by '${pmRunCommand()}' in package.json...`);
      replacePackageJsonRunCommand(outDir);
    }
  }

  async runCI(definition: Definition): Promise<void> {
    if (definition.ci) {
      this.step("Adding CI workflow...");

      if (!definition.dryRun) {
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
        const projectCIPath = path.join(
          this.#outDir(definition.destination),
          ".github",
          "workflows",
          "ci.yml"
        );
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

  async runGitInit(definition: Definition): Promise<void> {
    if (definition.git) {
      const s = this.spinner();

      const outDir = this.#outDir(definition.destination);

      if (fs.existsSync(path.join(outDir, ".git"))) {
        this.info("Git has already been initialized before. Skipping...");
      } else {
        s.start("Git initializing...");

        try {
          if (!definition.dryRun) {
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

  copyTemplate(definition: Definition, templatePath: string): void {
    if (!definition.dryRun) {
      const outDir = this.#outDir(definition.destination);
      try {
        ensureDirSync(outDir);
        copySync(templatePath, outDir);
      } catch (error) {
        this.error(this.red(`Template copy failed: ${error}`));
      }
    }
  }

  async start(definition: Definition): Promise<void> {
    this.intro(`Let's create a ${this.bgBlue(" QwikDev/astro App ")} ✨`);

    if (definition.add) {
      await this.add(definition);
    } else {
      await this.create(definition);
    }
  }

  end(definition: Definition, ranInstall: boolean): void {
    const outDir = this.#outDir(definition.destination);
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
}

export function app(name = pkg.name, version = pkg.version): Application {
  return new Application(name, version);
}

export default app();
