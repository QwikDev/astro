import { confirm, isCancel, log, select, text } from "@clack/prompts";
import {
  bgBlack,
  bgBlue,
  bgCyan,
  bgGreen,
  bgMagenta,
  bgRed,
  bgWhite,
  bgYellow,
  black,
  blue,
  bold,
  cyan,
  dim,
  gray,
  green,
  grey,
  hidden,
  inverse,
  italic,
  magenta,
  red,
  reset,
  strikethrough,
  underline,
  white,
  yellow
} from "kleur/colors";

export { cancel, note, intro, outro, spinner } from "@clack/prompts";

// Used from https://github.com/sindresorhus/is-unicode-supported/blob/main/index.js
export function isUnicodeSupported() {
  if (process.platform !== "win32") {
    return process.env.TERM !== "linux"; // Linux console (kernel)
  }

  return (
    Boolean(process.env.CI) ||
    Boolean(process.env.WT_SESSION) || // Windows Terminal
    Boolean(process.env.TERMINUS_SUBLIME) || // Terminus (<0.2.27)
    process.env.ConEmuTask === "{cmd::Cmder}" || // ConEmu and cmder
    process.env.TERM_PROGRAM === "Terminus-Sublime" ||
    process.env.TERM_PROGRAM === "vscode" ||
    process.env.TERM === "xterm-256color" ||
    process.env.TERM === "alacritty" ||
    process.env.TERMINAL_EMULATOR === "JetBrains-JediTerm"
  );
}

// Used from https://github.com/natemoo-re/clack/blob/main/packages/prompts/src/index.ts
const unicode = isUnicodeSupported();

export const icon = {
  success: unicode ? "✅" : "[OK]",
  error: unicode ? "❌" : "[ERROR]",
  info: unicode ? "ℹ️" : "[INFO]",
  warning: unicode ? "⚠️" : "[WARN]",
  debug: unicode ? "🐞" : "[DEBUG]",
  verbose: unicode ? "🔍" : "[DETAILS]",
  line: unicode ? "──" : "----"
} as const;

export const color = {
  red,
  green,
  blue,
  yellow,
  magenta,
  cyan,
  gray,
  grey,
  white,
  black
} as const;

export const background = {
  red: bgRed,
  green: bgGreen,
  blue: bgBlue,
  yellow: bgYellow,
  magenta: bgMagenta,
  cyan: bgCyan,
  white: bgWhite,
  black: bgBlack
} as const;

export const style = {
  reset,
  bold,
  dim,
  italic,
  underline,
  inverse,
  hidden,
  strikethrough
} as const;

export type Icon = keyof typeof icon;
export type Color = keyof typeof color;
export type Background = keyof typeof background;
export type Style = keyof typeof style;
export type OutputOptions = Partial<{
  icon: Icon;
  color: Color;
  bg: Background;
  style: Style;
}>;

interface Stringeable {
  toString(): string;
}

export class Output extends String implements Stringeable {
  constructor(value: string, options?: OutputOptions) {
    super(value);

    if (options) {
      this.apply(options);
    }
  }

  append(suffix: string): Output {
    return new Output(this.toString() + suffix);
  }

  prepend(prefix: string): Output {
    return new Output(prefix + this.toString());
  }

  apply(options: OutputOptions) {
    if (options.icon) {
      this.icon(options.icon);
    }

    if (options.color) {
      this.color(options.color);
    }

    if (options.bg) {
      this.bg(options.bg);
    }

    if (options.style) {
      this.style(options.style);
    }
  }

  icon(name: Icon): Output {
    return this.prepend(icon[name]);
  }

  color(name: Color): Output {
    return new Output(color[name](this.toString()));
  }

  bg(name: Background): Output {
    return new Output(background[name](this.toString()));
  }

  style(name: Style): Output {
    return new Output(style[name](this.toString()));
  }

  toString(): string {
    return super.toString();
  }
}

export function output(message: string, options: OutputOptions): Output {
  return new Output(message, options);
}

export function success(message: string): string {
  return green(`${icon.success} ${message}`);
}

export function error(message: string): string {
  return red(`${icon.error} ${message}`);
}

export function info(message: string): string {
  return blue(`${icon.info} ${message}`);
}

export function warn(message: string): string {
  return yellow(`${icon.warning} ${message}`);
}

export function debug(message: string): string {
  return magenta(`${icon.debug} ${message}`);
}

export function verbose(message: string): string {
  return gray(`${icon.verbose} ${message}`);
}

export function title(message: string): string {
  return `${gray(icon.line)} ${white(message)} ${gray(icon.line)}`;
}

export function printSuccess(message: string, ln = 0): void {
  console.log(success(message) + newLine(ln));
}

export function printError(message: string, ln = 0): void {
  console.error(error(message) + newLine(ln));
}

export function printInfo(message: string, ln = 0): void {
  console.info(info(message) + newLine(ln));
}

export function printWarning(message: string, ln = 0): void {
  console.warn(warn(message) + newLine(ln));
}

export function printDebug(message: string, ln = 0): void {
  console.debug(debug(message) + newLine(ln));
}

export function printTitle(message: string): void {
  console.log(title(message));
}

export function printVerbose(message: string): void {
  console.log(verbose(message));
}

export function logInfo(message: string): void {
  log.info(info(message));
}

export function logSuccess(message: string): void {
  log.success(success(message));
}

export function logStep(message: string): void {
  log.step(message);
}

export function logWarning(message: string): void {
  log.warn(warn(message));
}

export function logError(message: string): void {
  log.error(error(message));
}

// Inspired by https://github.com/QwikDev/qwik/blob/main/packages/qwik/src/cli/utils/utils.ts
export function panic(message: string): never {
  console.error(`${newLine()}${error(message)}${newLine()}`);
  process.exit(1);
}

export function newLine(count = 1): string {
  return "\n".repeat(count);
}

export async function scanString(
  message: string,
  initialValue?: string,
  it?: boolean
): Promise<string> {
  const input = !it
    ? initialValue
    : (await text({
        message,
        placeholder: initialValue
      })) || initialValue;

  ensureString(input);

  return input;
}

export async function scanChoice(
  message: string,
  options: { value: string; label: string }[],
  initialValue?: string,
  it?: boolean
): Promise<string> {
  const input = !it
    ? initialValue
    : (await select({
        message,
        options
      })) || initialValue;

  ensureString(input);

  return input;
}

export async function scanBoolean(
  message: string,
  initialValue?: boolean,
  it?: boolean,
  yes?: boolean,
  no?: boolean
): Promise<boolean> {
  const input =
    no && !initialValue
      ? false
      : (yes && initialValue !== false) ||
        initialValue ||
        (it &&
          (await confirm({
            message,
            initialValue
          })));

  ensureBoolean(input);

  return input;
}

export function ensureString<T extends string>(
  input: any,
  validate?: (v: string) => v is T
): asserts input is T {
  ensure(input, validate ?? isString);
}

export function ensureNumber<T extends number>(
  input: any,
  validate?: (v: number) => v is T
): asserts input is T {
  ensure(input, validate ?? isNumber);
}

export function ensureBoolean(input: any): asserts input is boolean {
  ensure(input, isBoolean);
}

export function ensureTrue(input: any): asserts input is true {
  ensure(input, (v) => v === true);
}

export function ensureFalse(input: any): asserts input is false {
  ensure(input, (v) => v === false);
}

export function ensure<T, U>(input: T, validate: (v: T) => U): asserts input is T {
  if (isCanceled(input)) {
    panic("Operation canceled.");
  }

  if (!validate(input)) {
    panic("Invalid input.");
  }
}

export function isString(input: any): input is string {
  return typeof input === "string" || input instanceof String;
}

export function isNumber(input: any): input is number {
  return typeof input === "number" && !Number.isNaN(input);
}

export function isBoolean(input: any): input is boolean {
  return typeof input === "boolean";
}

export function isCanceled(input: any): boolean {
  return isCancel(input) || typeof input === "symbol";
}
