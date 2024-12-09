import fs, { cpSync, existsSync, mkdirSync } from "node:fs";
import path from "node:path";
import { copySync, ensureDirSync } from "fs-extra";
import pkg from "../package.json";
import { type Adapter, type UserConfig, defaultConfig, defineConfig } from "./config";
import { Program } from "./core";
import {
  $,
  $pmInstall,
  $pmX,
  __dirname,
  clearDir,
  ensureBoolean,
  ensureString,
  getPackageManager,
  panic,
  pmRunCommand,
  replacePackageJsonRunCommand,
  resolveAbsoluteDir,
  resolveRelativeDir,
  sanitizePackageName,
  updatePackageName
} from "./utils";

export class Application extends Program {
  #packageManger = getPackageManager();
  #config: UserConfig = defaultConfig;

  async scanBoolean(
    message: string,
    initialValue?: boolean,
    positional = false
  ): Promise<boolean> {
    return super.scanBoolean(
      message,
      initialValue,
      this.#config.it,
      this.#config.yes,
      this.#config.no,
      positional
    );
  }

  async scanString(
    message: string,
    initialValue?: string,
    positional = false
  ): Promise<string> {
    return super.scanString(message, initialValue, this.#config.it, positional);
  }

  async scanChoice(
    message: string,
    options: { value: string; label: string }[],
    initialValue?: string,
    positional = false
  ): Promise<string> {
    return super.scanChoice(message, options, initialValue, this.#config.it, positional);
  }

  async scanProjectDirectory(): Promise<string> {
    return this.scanString(
      `Where would you like to create your new project? ${this.toGray(
        `(Use '.' or './' for current directory)`
      )}`,
      this.#config.project,
      true
    );
  }

  async scanAdapter(): Promise<Adapter> {
    const adapter =
      (this.#config.it &&
        (await this.scanBoolean("Would you like to use a server adapter?", false)) &&
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
            }
          ],
          this.#config.adapter
        ))) ||
      "default";

    ensureString<Adapter>(adapter, true);

    return adapter;
  }

  async scanPreferBiome(): Promise<boolean> {
    return this.scanBoolean(
      "Would you prefer Biome over ESLint/Prettier?",
      this.#config.biome
    );
  }

  async scanForce(outDir: string): Promise<boolean> {
    return this.scanBoolean(
      `Directory "./${resolveRelativeDir(
        outDir
      )}" already exists and is not empty. What would you like to overwrite it?`,
      this.#config.force
    );
  }

  async scanCI(): Promise<boolean> {
    return this.scanBoolean("Would you like to add CI workflow?", this.#config.ci);
  }

  async scanInstall(): Promise<boolean> {
    return this.scanBoolean(
      `Would you like to install ${this.#packageManger} dependencies?`,
      this.#config.install
    );
  }

  async scanGit(): Promise<boolean> {
    return this.scanBoolean("Would you like to initialize Git?", this.#config.git);
  }

  async execute(args: string[]) {
    this.#config = defineConfig(this.parse(args));
    this.#config.it = this.#config.it || args.length === 0;

    try {
      this.intro(`Let's create a ${this.toBgBlue(" QwikDev/astro App ")} ✨`);

      const projectAnswer = await this.scanProjectDirectory();

      const outDir: string = resolveAbsoluteDir(projectAnswer.trim());
      let add = false;

      if (outDir === process.cwd()) {
        add = await this.scanBoolean(
          "Do you want to add @QwikDev/astro to your existing project?"
        );
        ensureBoolean(add);
      }

      if (add) {
        await this.add(outDir);
      } else {
        await this.create(outDir, projectAnswer);
      }

      await this.runCI(outDir);
      const ranInstall = await this.runInstall(projectAnswer);
      await this.runGitInit(outDir);
      this.end(outDir, ranInstall);
    } catch (err) {
      console.error("An error occurred during QwikDev/astro project creation:", err);
      process.exit(1);
    }
  }

  async add(outDir: string) {
    this.logInfo("Adding @QwikDev/astro...");
    try {
      await $pmX("astro add @qwikdev/astro", outDir);
    } catch (e: any) {
      panic(`${e.message ?? e}: . Please try it manually.`);
    }
  }

  async create(outDir: string, project: string) {
    const adapter = await this.scanAdapter();
    const preferBiome = await this.scanPreferBiome();

    let starterKit = adapter;
    if (preferBiome) {
      starterKit += "-biome";
    }

    const templatePath = path.join(__dirname, "..", "stubs", "templates", starterKit);
    await this.createProject(outDir);
    this.copyTemplate(templatePath, outDir);
    await this.updatePackageJson(project, outDir);
  }

  async createProject(outDir: string): Promise<void> {
    this.logStep(`Creating new project in ${this.toBgBlue(` ${outDir} `)} ... 🐇`);

    if (fs.existsSync(outDir) && fs.readdirSync(outDir).length > 0) {
      const force = await this.scanForce(outDir);
      if (force) {
        if (!this.#config.dryRun) {
          await clearDir(outDir);
        }
      } else {
        this.logError(`Directory "${outDir}" already exists.`);
        this.logInfo(
          `Please either remove this directory, choose another location or run the command again with '--force | -f' flag.`
        );
        this.cancel();
        process.exit(1);
      }
    }
  }

  async updatePackageJson(projectAnswer: string, outDir: string) {
    const defaultPackageName = sanitizePackageName(projectAnswer);
    const packageName = await this.scanString(
      "What should be the name of this package?",
      defaultPackageName
    );

    updatePackageName(packageName, outDir);
    this.logInfo(`Updated package name to "${packageName}" 📦️`);

    if (getPackageManager() !== "npm") {
      this.logInfo(`Replacing 'npm run' by '${pmRunCommand()}' in package.json...`);
      replacePackageJsonRunCommand(outDir);
    }
  }

  async runCI(outDir: string): Promise<void> {
    const ci = await this.scanCI();

    if (ci) {
      this.logStep("Adding CI workflow...");

      if (!this.#config.dryRun) {
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
        const projectCIPath = path.join(outDir, ".github", "workflows", "ci.yml");
        cpSync(starterCIPath, projectCIPath, { force: true });
      }
    }
  }

  async runInstall(projectAnswer: string): Promise<boolean> {
    const runInstall = await this.scanInstall();

    let ranInstall = false;
    if (typeof runInstall !== "symbol" && runInstall) {
      this.logStep("Installing dependencies...");
      if (!this.#config.dryRun) {
        await $pmInstall(projectAnswer);
      }
      ranInstall = true;
    }

    return ranInstall;
  }

  async runGitInit(outDir: string): Promise<void> {
    const initGit = await this.scanGit();
    if (initGit) {
      const s = this.spinner();

      if (fs.existsSync(path.join(outDir, ".git"))) {
        this.logInfo("Git has already been initialized before. Skipping...");
      } else {
        s.start("Git initializing...");

        try {
          if (!this.#config.dryRun) {
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
          this.logError(
            this.toRed(
              "Git failed to initialize. You can do this manually by running: git init"
            )
          );
        }
      }
    }
  }

  copyTemplate(templatePath: string, outDir: string): void {
    if (!this.#config.dryRun) {
      try {
        ensureDirSync(outDir);
        copySync(templatePath, outDir);
      } catch (error) {
        this.logError(this.toRed(`Template copy failed: ${error}`));
      }
    }
  }

  end(outDir: string, ranInstall: boolean): void {
    const isCwdDir = process.cwd() === outDir;
    const relativeProjectPath = resolveRelativeDir(outDir);
    const outString = [];

    if (isCwdDir) {
      outString.push(`🦄 ${this.toBgMagenta(" Success! ")}`);
    } else {
      outString.push(
        `🦄 ${this.toBgMagenta(" Success! ")} ${this.toCyan(
          "Project created in"
        )} ${this.toBold(this.toMagenta(relativeProjectPath))} ${this.toCyan(
          "directory"
        )}`
      );
    }
    outString.push("");

    outString.push(`🐰 ${this.toCyan("Next steps:")}`);
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

export default app;
