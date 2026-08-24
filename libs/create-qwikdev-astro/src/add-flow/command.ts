import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import pm from "panam/pm";
import pkg from "../../package.json";
import { type Definition as BaseDefinition, Program } from "../core.js";
import { assertPmResult, resolveAbsoluteDir, stripJsonComments } from "../utils.js";
import {
  detectConfigFrameworks,
  hasQwikImport,
  isQwikRegistered
} from "./detect-config.js";
import { determineJsxStrategy } from "./jsx-strategy.js";
import { generateWarning, rewriteConfig } from "./rewrite-config.js";
import { scaffoldQwikComponent } from "./scaffold.js";

export type AddDefinition = BaseDefinition & {
  directory: string;
  dryRun?: boolean;
};

export type AddInput = {
  directory: string;
  absDir: string;
  dryRun: boolean;
};

export const defaultAddDefinition = {
  directory: ".",
  dryRun: undefined,
  yes: undefined,
  no: undefined
} as const;

export function defineAddDefinition(definition: Partial<AddDefinition>): AddDefinition {
  return { ...defaultAddDefinition, ...definition };
}

export class AddCommand extends Program<AddDefinition, AddInput> {
  configure(): void {
    this.strict()
      .interactive()
      .alias("h", "help")
      .useYes()
      .useNo()
      .command(
        "* [directory]",
        "Add Qwik to an existing Astro project with multi-framework support"
      )
      .argument("directory", {
        type: "string",
        default: defaultAddDefinition.directory,
        desc: "Project directory to add Qwik to"
      })
      .option("dryRun", {
        type: "boolean",
        default: false,
        desc: "Show planned changes without modifying files"
      });
  }

  parse(args: string[]): AddDefinition {
    return defineAddDefinition(super.parse(args));
  }

  validate(definition: AddDefinition): AddInput {
    const absDir = resolveAbsoluteDir(definition.directory);
    return {
      directory: definition.directory,
      absDir,
      dryRun: !!definition.dryRun
    };
  }

  async interact(definition: AddDefinition): Promise<AddInput> {
    let directory = definition.directory;

    if (directory === defaultAddDefinition.directory) {
      directory = await this.scanString(
        `Which project directory would you like to add Qwik to? ${this.gray("(Use '.' for current directory)")}`,
        definition.directory
      );
    }

    const absDir = resolveAbsoluteDir(directory.trim());
    return {
      directory,
      absDir,
      dryRun: definition.dryRun ?? false
    };
  }

  async execute(input: AddInput): Promise<number> {
    try {
      this.intro("Adding Qwik to your project...");

      // Step 1: Locate astro.config file
      const configExtensions = [".mts", ".ts", ".mjs", ".js"];
      let configPath: string | null = null;
      let configSource: string | null = null;

      for (const ext of configExtensions) {
        const candidate = join(input.absDir, `astro.config${ext}`);
        if (existsSync(candidate)) {
          configPath = candidate;
          configSource = readFileSync(candidate, "utf-8");
          break;
        }
      }

      // Step 2: No astro.config — run astro add directly
      if (!configPath || configSource === null) {
        this.warn("No astro.config file found — running astro add directly.");
        if (!input.dryRun) {
          assertPmResult(
            await pm.x("astro add @qwik.dev/astro", { cwd: input.absDir }),
            "astro add @qwik.dev/astro"
          );
        } else {
          this.info(`Would run: astro add @qwik.dev/astro via ${pm.name}`);
        }
        const strategy = determineJsxStrategy("primary");
        this.persistTsconfig(input, strategy);
        await scaffoldQwikComponent(input.absDir, strategy, input.dryRun);
        this.outro("Qwik added successfully!");
        return 0;
      }

      // Step 3: If the config imports @qwik.dev/astro, install the package
      // first so `astro add` can load the config without crashing.
      const qwikImported = hasQwikImport(configSource);

      // Step 3b: Check if qwik() is already registered in the integrations array.
      // If so, skip astro add to prevent duplicate integration entries.
      const qwikRegistered = isQwikRegistered(configSource);

      // Step 4: Detect existing JSX frameworks in config
      const configResult = detectConfigFrameworks(configSource);

      // Step 5: Handle each outcome
      if (configResult.outcome === "none") {
        // No other frameworks — add Qwik as primary
        await this.installQwik(input, qwikImported, qwikRegistered);
        const strategy = determineJsxStrategy("primary");
        this.persistTsconfig(input, strategy);
        await scaffoldQwikComponent(input.absDir, strategy, input.dryRun);
        this.outro("Qwik added successfully!");
        return 0;
      }

      if (
        configResult.outcome === "unsafe" ||
        configResult.outcome === "already-configured"
      ) {
        this.warn(generateWarning(configResult));
        await this.installQwik(input, qwikImported, qwikRegistered);
        // Do NOT silently set jsxImportSource — the user was warned the config is
        // unsafe or already-configured. They must handle JSX ownership manually.
        this.info(
          "Skipping tsconfig jsxImportSource — configure JSX ownership manually if needed."
        );
        const strategy = determineJsxStrategy("secondary");
        await scaffoldQwikComponent(input.absDir, strategy, input.dryRun);
        this.outro("Qwik added successfully!");
        return 0;
      }

      // outcome === "safe" — prompt for JSX strategy, rewrite config, scaffold
      const choice = (await this.scanChoice(
        "Should Qwik be the primary JSX source?",
        [
          {
            value: "primary",
            label: "Yes — Qwik owns tsconfig jsxImportSource"
          },
          {
            value: "secondary",
            label: "No — keep existing framework as primary"
          }
        ],
        "primary"
      )) as "primary" | "secondary";

      const strategy = determineJsxStrategy(choice);
      this.persistTsconfig(input, strategy);
      const rewrittenSource = rewriteConfig(configSource, configResult);

      if (rewrittenSource !== null) {
        if (!input.dryRun) {
          writeFileSync(configPath, rewrittenSource, "utf-8");
        } else {
          this.info(`Would rewrite: ${configPath}`);
        }
      }

      await scaffoldQwikComponent(input.absDir, strategy, input.dryRun);
      await this.installQwik(input, qwikImported, qwikRegistered);

      this.outro("Qwik added successfully!");
      return 0;
    } catch (err) {
      this.error(String(err));
      return 1;
    }
  }

  /**
   * Install @qwik.dev/astro.
   *
   * - If the config already imports the package (`qwikImported`), pre-install
   *   it so `astro add` can load the config without crashing.
   * - If qwik() is already registered in the integrations array (`qwikRegistered`),
   *   skip `astro add` entirely to prevent duplicate integration entries.
   * - Otherwise run `astro add` as usual.
   */
  private async installQwik(
    input: AddInput,
    qwikImported: boolean,
    qwikRegistered: boolean
  ): Promise<void> {
    if (input.dryRun) {
      if (qwikImported) {
        this.info("@qwik.dev/astro found in config — would pre-install packages.");
      }
      if (qwikRegistered) {
        this.info("Would skip astro add (already registered in config).");
      } else {
        this.info(`Would run: astro add @qwik.dev/astro via ${pm.name}`);
      }
      return;
    }

    if (qwikImported) {
      this.info("@qwik.dev/astro found in config — installing before astro add.");
      assertPmResult(
        await pm.add(["@qwik.dev/astro", "@qwik.dev/core"], {
          cwd: input.absDir
        }),
        "pm.add @qwik.dev/astro"
      );
    }

    if (qwikRegistered) {
      this.info("@qwik.dev/astro already registered in config — skipping astro add.");
      return;
    }

    assertPmResult(
      await pm.x("astro add @qwik.dev/astro", { cwd: input.absDir }),
      "astro add @qwik.dev/astro"
    );
  }

  private persistTsconfig(
    input: AddInput,
    strategy: import("./jsx-strategy.js").JsxStrategy
  ): void {
    if (strategy.tsconfigSource === null) return;

    const tsconfigPath = join(input.absDir, "tsconfig.json");
    if (!existsSync(tsconfigPath)) return;

    const tsconfigRaw = readFileSync(tsconfigPath, "utf-8");
    const tsconfig = JSON.parse(stripJsonComments(tsconfigRaw));
    tsconfig.compilerOptions = tsconfig.compilerOptions ?? {};
    tsconfig.compilerOptions.jsxImportSource = strategy.tsconfigSource;

    if (!input.dryRun) {
      writeFileSync(tsconfigPath, `${JSON.stringify(tsconfig, null, 2)}\n`, "utf-8");
    } else {
      this.info(
        `Would set jsxImportSource to ${strategy.tsconfigSource} in tsconfig.json`
      );
    }
  }
}

export function add(name = pkg.name, version = pkg.version): AddCommand {
  return new AddCommand(name, version);
}

export default add();
