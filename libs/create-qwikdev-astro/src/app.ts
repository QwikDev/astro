import fs, { cpSync, existsSync, mkdirSync } from "node:fs";
import path from "node:path";
import { cancel, intro, log, note, outro, select, spinner } from "@clack/prompts";
import { bgBlue, bgMagenta, bold, cyan, gray, magenta, red } from "kleur/colors";
import {
  type Adapter,
  type Config,
  type UserConfig,
  defaultConfig,
  defineConfig
} from "./config";
import {
  $,
  clearDir,
  ensureString,
  getPackageManager,
  installDependencies,
  pmRunCommand,
  replacePackageJsonRunCommand,
  resolveAbsoluteDir,
  resolveRelativeDir,
  sanitizePackageName,
  scanBoolean,
  scanString,
  updatePackageName
} from "./utils";

export class Application {
  #config: Config;
  #packageManger: string;

  constructor(options: UserConfig) {
    this.#config = defineConfig(options);
    this.#packageManger = getPackageManager();
  }

  async scanBoolean(
    message: string,
    initialValue: boolean,
    positional = false
  ): Promise<boolean> {
    return scanBoolean(
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
    initialValue: string,
    positional = false
  ): Promise<string> {
    return scanString(message, initialValue, this.#config.it, positional);
  }

  async scanProjectDirectory(): Promise<string> {
    return this.scanString(
      `Where would you like to create your new project? ${gray(
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
      this.#config.adapter ||
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

  async run(): Promise<void> {
    try {
      intro(`Let's create a ${bgBlue(" QwikDev/astro App ")} ✨`);

      const packageManager = getPackageManager();
      const projectAnswer = await this.scanProjectDirectory();
      const adapter = await this.scanAdapter();
      const preferBiome = await this.scanPreferBiome();

      let starterKit = adapter;
      if (preferBiome) {
        starterKit += "-biome";
      }

      const templatePath = path.join(__dirname, "..", "stubs", "templates", starterKit);
      const outDir: string = resolveAbsoluteDir(projectAnswer.trim());

      log.step(`Creating new project in ${bgBlue(` ${outDir} `)} ... 🐇`);

      if (fs.existsSync(outDir) && fs.readdirSync(outDir).length > 0) {
        const force = await this.scanForce(outDir);
        if (force) {
          if (!this.#config.dryRun) {
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

      if (!this.#config.dryRun) {
        if (!existsSync(outDir)) {
          mkdirSync(outDir, { recursive: true });
        }
        cpSync(templatePath, outDir, { recursive: true });
      }

      const defaultPackageName = sanitizePackageName(projectAnswer);
      const packageName = await this.scanString(
        "What should be the name of this package?",
        defaultPackageName
      );

      updatePackageName(packageName, outDir);
      log.info(`Updated package name to "${packageName}" 📦️`);

      if (packageManager !== "npm") {
        log.info(`Replacing 'npm run' by '${pmRunCommand()}' in package.json...`);
        replacePackageJsonRunCommand(outDir);
      }

      const addCIWorkflow = await this.scanCI();

      if (addCIWorkflow && !this.#config.dryRun) {
        const starterCIPath = path.join(
          __dirname,
          "..",
          "stubs",
          "workflows",
          `${
            ["npm", "yarn", "pnpm", "bun"].includes(packageManager)
              ? packageManager
              : "npm"
          }-ci.yml`
        );
        const projectCIPath = path.join(outDir, ".github", "workflows", "ci.yml");
        cpSync(starterCIPath, projectCIPath, { force: true });
      }

      const runInstall = await this.scanInstall();

      let ranInstall = false;
      if (typeof runInstall !== "symbol" && runInstall) {
        log.step("Installing dependencies...");
        if (!this.#config.dryRun) {
          await installDependencies(projectAnswer);
        }
        ranInstall = true;
      }

      const initGit = await this.scanGit();

      if (initGit) {
        const s = spinner();

        if (fs.existsSync(path.join(outDir, ".git"))) {
          log.info("Git has already been initialized before. Skipping...");
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
            log.error(
              red(
                "Git failed to initialize. You can do this manually by running: git init"
              )
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
}

export function app(options: UserConfig): Application {
  return new Application(options);
}

const _app: Application = app(defaultConfig);

export default _app;
