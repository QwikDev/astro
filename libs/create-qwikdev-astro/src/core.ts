import yargs, {
  type Argv,
  type PositionalOptions as ArgumentConfig,
  type Options as OptionConfig
} from "yargs";
import { hideBin } from "yargs/helpers";
import { scanBoolean, scanString } from "./utils";

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

export abstract class BaseApplication {
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
  ) {}

  addCommand(signature: string, description: string): Command {
    const _command = new Command(signature, description);

    if (this.#yes) {
      _command.option("yes", {
        alias: "y",
        type: "boolean",
        desc: "Skip all prompts by accepting defaults"
      });
    }

    if (this.#no) {
      _command.option("no", {
        alias: "n",
        type: "boolean",
        desc: "Skip all prompts by declining defaults"
      });
    }

    if (this.#it) {
      _command.option("it", {
        type: "boolean",
        desc: "Execute actions interactively"
      });
    }

    if (this.#dryRun) {
      _command.option("dryRun", {
        type: "boolean",
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

  parseArgs<T>(args: string[]): T {
    const _yargs = yargs(args);

    if (this.#strict) {
      _yargs.strict();
    }

    if (this.#yes && this.#no) {
      _yargs.conflicts("yes", "no");
    }

    this.#parseCommands(_yargs);

    _yargs.version(this.version);

    for (const { shortName, longName } of this.aliases) {
      _yargs.alias(shortName, longName);
    }

    const parsedArgs = _yargs.argv as unknown as T;
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
    return scanBoolean(message, initialValue, this.#it, this.#yes, this.#no, positional);
  }

  async scanString(
    message: string,
    initialValue?: string,
    positional = false
  ): Promise<string> {
    return scanString(message, initialValue, this.#it, positional);
  }

  /** @param args Pass here process.argv.slice(2) */
  abstract execute(args: string[]): void | Promise<void>;

  /** @param args Pass here process.argv */
  async run(args = process.argv): Promise<void> {
    await this.execute(hideBin(args));
  }
}
