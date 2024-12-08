import fs, { cpSync, existsSync, mkdirSync } from "node:fs";
import path from "node:path";
import { cancel, intro, log, note, outro, select, spinner } from "@clack/prompts";
import { bgBlue, bgMagenta, bold, cyan, gray, magenta, red } from "kleur/colors";
import yargs, {
  type Argv,
  type PositionalOptions as ArgumentConfig,
  type Options as OptionConfig
} from "yargs";
import { hideBin } from "yargs/helpers";
import {
  type Adapter,
  type Config,
  type UserConfig,
  defaultConfig,
  defineConfig
} from "./config";
import {
  $,
  $pmInstall,
  $pmX,
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
  scanBoolean,
  scanString,
  updatePackageName
} from "./utils";

export type Alias = { shortName: string; longName: string };

export type Example = {
  command: string;
  description: string;
};

export class Command {
  readonly arguments = new Map<string, ArgumentConfig>();
  readonly options = new Map<string, OptionConfig>();
  readonly examples = new Set<Example>();
  #usage = "";

  constructor(
    readonly signature: string,
    readonly description: string
  ) {}

  setArgument(name: string, options: ArgumentConfig): this {
    this.arguments.set(name, options);

    return this;
  }

  getArgument(name: string): ArgumentConfig | undefined {
    return this.arguments.get(name);
  }

  hasArgument(name: string): boolean {
    return this.arguments.has(name);
  }

  argument(name: string): ArgumentConfig | undefined;
  argument(name: string, options: ArgumentConfig): this;
  argument(name: string, options?: ArgumentConfig): this | ArgumentConfig | undefined {
    return options ? this.setArgument(name, options) : this.getArgument(name);
  }

  setOption(name: string, options: OptionConfig): this {
    this.options.set(name, options);

    return this;
  }

  getOption(name: string): OptionConfig | undefined {
    return this.options.get(name);
  }

  hasOption(name: string): boolean {
    return this.options.has(name);
  }

  option(name: string): OptionConfig | undefined;
  option(name: string, options: OptionConfig): this;
  option(name: string, options?: OptionConfig): this | OptionConfig | undefined {
    return options ? this.setOption(name, options) : this.getOption(name);
  }

  addExample(command: string, description: string): this {
    this.examples.add({ command, description });

    return this;
  }

  getExample(commandOrDescription: string): Example | undefined {
    return this.examples
      .values()
      .find(
        (example) =>
          example.command === commandOrDescription ||
          example.description === commandOrDescription
      );
  }

  example(commandOrDescription: string): Example | undefined;
  example(command: string, description: string): this;
  example(
    commandOrDescription: string,
    description?: string
  ): this | Example | undefined {
    return description
      ? this.addExample(commandOrDescription, description)
      : this.getExample(commandOrDescription);
  }

  getExamples(): Example[] {
    return this.examples.values().toArray();
  }

  setUsage(message: string): this {
    this.#usage = message;

    return this;
  }

  getUsage(): string {
    return this.#usage;
  }

  usage(): string;
  usage(message: string): this;
  usage(message?: string): this | string {
    return message ? this.setUsage(message) : this.getUsage();
  }
}

export function command(signature: string, description: string): Command {
  return new Command(signature, description);
}

export class Application {
  #config: UserConfig = defaultConfig;
  #packageManger: string;
  #strict = false;
  #it = false;
  #yes = false;
  #no = false;
  #dryRun = false;
  readonly commands = new Set<Command>();
  readonly aliases = new Set<Alias>();

  constructor(
    readonly name: string,
    readonly version: string
  ) {
    this.#packageManger = getPackageManager();
  }

  addCommand(signature: string, description: string): Command {
    const _command = command(signature, description);

    if (this.#yes) {
      _command.option("yes", {
        alias: "y",
        default: defaultConfig.yes,
        type: "boolean",
        desc: "Skip all prompts by accepting defaults"
      });
    }

    if (this.#no) {
      _command.option("no", {
        alias: "n",
        type: "boolean",
        default: defaultConfig.no,
        desc: "Skip all prompts by declining defaults"
      });
    }

    if (this.#it) {
      _command.option("it", {
        type: "boolean",
        default: defaultConfig.it,
        desc: "Execute actions interactively"
      });
    }

    if (this.#dryRun) {
      _command.option("dryRun", {
        type: "boolean",
        default: defaultConfig.dryRun,
        desc: "Walk through steps without executing"
      });
    }

    this.commands.add(_command);

    return _command;
  }

  getCommand(signatureOrDescription: string): Command | undefined {
    return this.commands
      .values()
      .find(
        (command) =>
          command.signature === signatureOrDescription ||
          command.description === signatureOrDescription
      );
  }

  command(signatureOrDescription: string): Command | undefined;
  command(signature: string, description: string): Command;
  command(signatureOrDescription: string, description?: string): Command | undefined {
    return description
      ? this.addCommand(signatureOrDescription, description)
      : this.getCommand(signatureOrDescription);
  }

  getCommands(): Command[] {
    return this.commands.values().toArray();
  }

  strict(enabled = true): this {
    this.#strict = enabled;

    return this;
  }

  it(enabled = true): this {
    this.#it = enabled;

    return this;
  }

  dryRun(enabled = true): this {
    this.#dryRun = enabled;

    return this;
  }

  yes(enabled = true): this {
    this.#yes = enabled;

    return this;
  }

  no(enabled = true): this {
    this.#no = enabled;

    return this;
  }

  addAlias(shortName: string, longName: string): this {
    this.aliases.add({ shortName, longName });

    return this;
  }

  getAlias(shortOrLongName: string): Alias | undefined {
    return this.aliases
      .values()
      .find(
        (alias) =>
          alias.shortName === shortOrLongName || alias.longName === shortOrLongName
      );
  }

  alias(shortOrLongName: string): Alias | undefined;
  alias(shortName: string, longName: string): this;
  alias(shortOrLongName: string, longName?: string): this | Alias | undefined {
    return longName
      ? this.addAlias(shortOrLongName, longName)
      : this.getAlias(shortOrLongName);
  }

  getAliases(): Alias[] {
    return this.aliases.values().toArray();
  }

  parseArgs(args: string[]): UserConfig {
    const _yargs = yargs(args);

    if (this.#strict) {
      _yargs.strict();
    }

    this.#parseCommands(_yargs);

    _yargs.version(this.version);

    for (const { shortName, longName } of this.aliases) {
      _yargs.alias(shortName, longName);
    }

    const parsedArgs = _yargs.argv as unknown as UserConfig;
    return parsedArgs;
  }

  #parseCommands(argv: Argv) {
    for (const command of this.commands) {
      this.#parseCommand(argv, command);
    }
  }

  #parseCommand(argv: Argv, command: Command) {
    argv.command(command.signature, command.description, (cmdYargs) => {
      this.#parseArguments(argv, command.arguments);
      this.#parseOptions(argv, command.options);
      this.#parseExamples(argv, command.examples);
      cmdYargs.usage(command.usage());
    });
  }

  #parseArguments(argv: Argv, args: Map<string, ArgumentConfig>) {
    for (const [name, options] of args) {
      this.#parseArgument(argv, name, options);
    }
  }

  #parseArgument(argv: Argv, name: string, options: ArgumentConfig) {
    argv.positional(name, options);
  }

  #parseOptions(argv: Argv, opts: Map<string, OptionConfig>) {
    for (const [name, options] of opts) {
      this.#parseOption(argv, name, options);
    }
  }

  #parseOption(argv: Argv, name: string, options: OptionConfig) {
    argv.option(name, options);
  }

  #parseExamples(argv: Argv, examples: Set<Example>) {
    for (const example of examples) {
      this.#parseExample(argv, example.command, example.description);
    }
  }

  #parseExample(argv: Argv, command: string, description: string) {
    argv.example(command, description);
  }

  async scanBoolean(
    message: string,
    initialValue?: boolean,
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
    initialValue?: string,
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

  /** @param args Pass here process.argv.slice(2) */
  async execute(args: string[]) {
    this.#config = defineConfig(this.parseArgs(args));
    this.#config.it = this.#config.it || args.length === 0;

    try {
      intro(`Let's create a ${bgBlue(" QwikDev/astro App ")} ✨`);

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

  /** @param args Pass here process.argv */
  async run(args = process.argv): Promise<void> {
    await this.execute(hideBin(args));
  }

  async add(outDir: string) {
    log.info("Adding @QwikDev/astro...");
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
  }

  async updatePackageJson(projectAnswer: string, outDir: string) {
    const defaultPackageName = sanitizePackageName(projectAnswer);
    const packageName = await this.scanString(
      "What should be the name of this package?",
      defaultPackageName
    );

    updatePackageName(packageName, outDir);
    log.info(`Updated package name to "${packageName}" 📦️`);

    if (getPackageManager() !== "npm") {
      log.info(`Replacing 'npm run' by '${pmRunCommand()}' in package.json...`);
      replacePackageJsonRunCommand(outDir);
    }
  }

  async runCI(outDir: string): Promise<void> {
    const ci = await this.scanCI();

    if (ci) {
      log.step("Adding CI workflow...");

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
      log.step("Installing dependencies...");
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
            red("Git failed to initialize. You can do this manually by running: git init")
          );
        }
      }
    }
  }

  copyTemplate(templatePath: string, outDir: string): void {
    if (!this.#config.dryRun) {
      if (!existsSync(outDir)) {
        mkdirSync(outDir, { recursive: true });
      }
      cpSync(templatePath, outDir, { recursive: true });
    }
  }

  end(outDir: string, ranInstall: boolean): void {
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
      outString.push(`   ${getPackageManager()} install`);
    }
    outString.push(`   ${getPackageManager()} start`);

    note(outString.join("\n"), "Ready to start 🚀");

    outro("Happy coding! 💻🎉");
  }
}

export function app(name: string, version: string): Application {
  return new Application(name, version);
}

const _pkg = await import("../package.json");
const _app: Application = app(_pkg.name, _pkg.version);

export default _app;
