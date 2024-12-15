import yargs, {
  type Argv,
  type PositionalOptions as ArgumentConfig,
  type Options as OptionConfig
} from "yargs";
import { hideBin } from "yargs/helpers";
import {
  background,
  cancel,
  color,
  intro,
  logError,
  logInfo,
  logStep,
  logSuccess,
  logWarning,
  note,
  outro,
  panic,
  scanBoolean,
  scanChoice,
  scanString,
  spinner,
  style
} from "./console";

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

export type Config = {
  it?: boolean;
  yes?: boolean;
  no?: boolean;
  dryRun?: boolean;
};

export abstract class Program<T extends Config> {
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
    this.configure();
  }

  configure(): void {}

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

  abstract execute(input: T): number | Promise<number>;

  /** @param args Pass here process.argv */
  async run(args = process.argv): Promise<number> {
    let input = this.parse(hideBin(args));

    const it = this.#it && (input.it || args.length === 0);

    if (it) {
      input = await this.interact(input);
    }

    this.validate(input);

    return await this.execute(input);
  }

  validate(input: T): asserts input is Required<T> {}

  interact(args: T): T | Promise<T> {
    return args;
  }

  parse(args: string[]): T {
    const _yargs = yargs(args);

    _yargs.scriptName(this.name);

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
    it = false,
    yes = false,
    no = false
  ): Promise<boolean> {
    return scanBoolean(
      message,
      initialValue,
      this.#it && it,
      this.#yes && yes,
      this.#no && no
    );
  }

  async scanString(message: string, initialValue?: string, it = false): Promise<string> {
    return scanString(message, initialValue, this.#it && it);
  }

  async scanChoice(
    message: string,
    options: { value: string; label: string }[],
    initialValue?: string,
    it = false
  ): Promise<string> {
    return scanChoice(message, options, initialValue, this.#it && it);
  }

  panic(message: string): never {
    panic(message);
  }

  cancel(message?: string) {
    cancel(message);
  }

  intro(title?: string) {
    intro(title);
  }

  outro(message?: string) {
    outro(message);
  }

  note(message?: string, title?: string) {
    note(message, title);
  }

  spinner() {
    return spinner();
  }

  info(message: string) {
    logInfo(message);
  }

  warn(message: string) {
    logWarning(message);
  }

  error(message: string) {
    logError(message);
  }

  step(message: string) {
    logStep(message);
  }

  success(message: string) {
    logSuccess(message);
  }

  red(output: string | number | boolean): string {
    return color.red(output);
  }

  green(output: string | number | boolean): string {
    return color.green(output);
  }

  blue(output: string | number | boolean): string {
    return color.blue(output);
  }

  yellow(output: string | number | boolean): string {
    return color.yellow(output);
  }

  magenta(output: string | number | boolean): string {
    return color.magenta(output);
  }

  cyan(output: string | number | boolean): string {
    return color.cyan(output);
  }

  gray(output: string | number | boolean): string {
    return color.gray(output);
  }

  grey(output: string | number | boolean): string {
    return color.grey(output);
  }

  white(output: string | number | boolean): string {
    return color.white(output);
  }

  black(output: string | number | boolean): string {
    return color.black(output);
  }

  bgRed(output: string | number | boolean): string {
    return background.red(output);
  }

  bgGreen(output: string | number | boolean): string {
    return background.green(output);
  }

  bgBlue(output: string | number | boolean): string {
    return background.blue(output);
  }

  bgYellow(output: string | number | boolean): string {
    return background.yellow(output);
  }

  bgMagenta(output: string | number | boolean): string {
    return background.magenta(output);
  }

  bgCyan(output: string | number | boolean): string {
    return background.cyan(output);
  }

  bgWhite(output: string | number | boolean): string {
    return background.white(output);
  }

  bgBlack(output: string | number | boolean): string {
    return background.black(output);
  }

  reset(output: string | number | boolean): string {
    return style.reset(output);
  }

  dim(output: string | number | boolean): string {
    return style.dim(output);
  }

  bold(output: string | number | boolean): string {
    return style.bold(output);
  }

  italic(output: string | number | boolean): string {
    return style.italic(output);
  }

  underline(output: string | number | boolean): string {
    return style.underline(output);
  }

  inverse(output: string | number | boolean): string {
    return style.inverse(output);
  }

  hidden(output: string | number | boolean): string {
    return style.hidden(output);
  }

  strikethrough(output: string | number | boolean): string {
    return style.strikethrough(output);
  }
}
