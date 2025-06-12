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
  ensureBoolean,
  ensureString,
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
import { isCI, isTest } from "./utils";

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

export type Definition = {
  yes?: boolean;
  no?: boolean;
};

export abstract class Program<
  T extends Definition,
  U extends Required<Omit<T, "it" | "yes" | "no">>
> {
  #strict = false;
  #interactive = false;
  #useYes = false;
  #useNo = false;
  #conflicts: Record<string, string> = {};
  readonly commands = new Set<Command>();
  readonly aliases = new Set<Alias>();
  readonly interactions = new Map<string, unknown>();

  constructor(
    readonly name: string,
    readonly version: string
  ) {
    this.configure();
  }

  configure(): void {}

  addCommand(signature: string, description: string): Command {
    const _command = new Command(signature, description);

    if (this.#useYes) {
      _command.option("yes", {
        alias: "y",
        type: "boolean",
        desc: "Skip all prompts by accepting defaults"
      });
    }

    if (this.#useNo) {
      _command.option("no", {
        alias: "n",
        type: "boolean",
        desc: "Skip all prompts by declining defaults"
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

  conflict(key: string, value: string): this {
    this.#conflicts[key] = value;

    return this;
  }

  interactive(enabled = true): this {
    this.#interactive = enabled;

    return this;
  }

  useYes(enabled = true): this {
    this.#useYes = enabled;

    return this;
  }

  useNo(enabled = true): this {
    this.#useNo = enabled;

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

  abstract execute(
    input: ReturnType<typeof this.interact> | ReturnType<typeof this.validate>
  ): number | Promise<number>;

  /** @param argv Pass here process.argv */
  async run(argv = process.argv): Promise<number> {
    const args = hideBin(argv);

    const definition = this.parse(args);

    let input: U;

    if (this.isIt()) {
      input = await this.interact(definition);
    } else {
      input = this.validate(definition);
    }

    return await this.execute(input);
  }

  isIt(): boolean {
    return this.#interactive && !(isTest() || isCI());
  }

  abstract validate(definition: T): U;

  intercept(question: string, answer: unknown): this {
    return this.setInteraction(question, answer);
  }

  async interact(definition: T): Promise<U> {
    return this.validate(definition);
  }

  parse(args: string[]): T {
    const _yargs = yargs(args);

    _yargs.scriptName(this.name);

    if (this.#strict) {
      _yargs.strict();
    }

    if (this.#useYes && this.#useNo) {
      _yargs.conflicts("yes", "no");
    }

    this.#parseCommands(_yargs);

    _yargs.version(this.version);

    for (const [key, value] of Object.entries(this.#conflicts)) {
      _yargs.conflicts(key, value);
    }

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

  getInteraction(message: string): unknown {
    for (const question of this.interactions.keys()) {
      if (message.includes(question) || RegExp(question).test(message)) {
        return this.interactions.get(question);
      }
    }

    return undefined;
  }

  setInteraction<T>(question: string, answer: T): this {
    this.interactions.set(question, answer);

    return this;
  }

  async scanBoolean(
    definition: T,
    message: string
  ): Promise<
    typeof definition.no extends true
      ? false
      : typeof definition.yes extends true
        ? true
        : undefined
  >;
  async scanBoolean(
    definition: T,
    message: string,
    initialValue: boolean
  ): Promise<
    typeof definition.no extends true
      ? false
      : typeof definition.yes extends true
        ? true
        : boolean
  >;
  async scanBoolean(
    definition: T,
    message: string,
    initialValue?: boolean
  ): Promise<
    typeof definition.no extends true
      ? false
      : typeof definition.yes extends true
        ? true
        : typeof initialValue
  > {
    const value = this.getInteraction(message);

    if (value !== undefined) {
      ensureBoolean(value);

      return value;
    }

    return initialValue !== undefined
      ? scanBoolean(
          message,
          initialValue,
          this.isIt(),
          this.#useYes && definition.yes,
          this.#useNo && definition.no
        )
      : scanBoolean(
          message,
          undefined,
          this.isIt(),
          this.#useYes && definition.yes,
          this.#useNo && definition.no
        );
  }

  async scanString(message: string): Promise<string | undefined>;
  async scanString(message: string, initialValue: string): Promise<string>;
  async scanString(
    message: string,
    initialValue?: string
  ): Promise<string | typeof initialValue> {
    const value = this.getInteraction(message);

    if (value !== undefined) {
      ensureString(value);

      return value;
    }

    return initialValue
      ? scanString(message, initialValue, this.isIt())
      : scanString(message, undefined, this.isIt());
  }

  async scanChoice<V extends string>(
    message: string,
    options: { value: string; label: string }[]
  ): Promise<V | undefined>;
  async scanChoice<V extends string>(
    message: string,
    options: { value: string; label: string }[],
    initialValue: V
  ): Promise<V>;
  async scanChoice<V extends string>(
    message: string,
    options: { value: string; label: string }[],
    initialValue?: V
  ): Promise<V | typeof initialValue> {
    const value = this.getInteraction(message);

    if (value !== undefined) {
      ensureString<V>(
        value,
        (v): v is V => options.find((o) => o.value === v) !== undefined
      );

      return value;
    }

    return initialValue
      ? scanChoice(message, options, initialValue, this.isIt())
      : scanChoice(message, options, undefined, this.isIt());
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
