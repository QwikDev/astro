import pkg from "../../package.json";
import pm from "panam/pm";
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { type Definition as BaseDefinition, Program } from "../core.js";
import { resolveAbsoluteDir } from "../utils.js";
import { detectConfigFrameworks } from "./detect-config.js";
import { detectSourceFrameworks } from "./detect-source.js";
import { rewriteConfig, generateWarning } from "./rewrite-config.js";
import { determineJsxStrategy } from "./jsx-strategy.js";
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

export function defineAddDefinition(
  definition: Partial<AddDefinition>
): AddDefinition {
  return { ...defaultAddDefinition, ...definition };
}

export class AddCommand extends Program<AddDefinition, AddInput> {
  configure(): void {
    this.strict()
      .interactive()
      .alias("h", "help")
      .useYes()
      .useNo()
      .command("* [directory]", "Add Qwik to an existing Astro project with multi-framework support")
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
          await pm.x("astro add @qwik.dev/astro", { cwd: input.absDir });
        } else {
          this.info(`Would run: astro add @qwik.dev/astro via ${pm.name}`);
        }
        const strategy = determineJsxStrategy("primary");
        await scaffoldQwikComponent(input.absDir, strategy, input.dryRun);
        this.outro("Qwik added successfully!");
        return 0;
      }

      // Step 3: Detect existing frameworks in config and source
      const configResult = detectConfigFrameworks(configSource);
      await detectSourceFrameworks(input.absDir);

      // Step 4: Handle each outcome
      if (configResult.outcome === "none") {
        // No other frameworks — add Qwik as primary
        if (!input.dryRun) {
          await pm.x("astro add @qwik.dev/astro", { cwd: input.absDir });
        } else {
          this.info(`Would run: astro add @qwik.dev/astro via ${pm.name}`);
        }
        const strategy = determineJsxStrategy("primary");
        await scaffoldQwikComponent(input.absDir, strategy, input.dryRun);
        this.outro("Qwik added successfully!");
        return 0;
      }

      if (configResult.outcome === "unsafe" || configResult.outcome === "already-configured") {
        this.warn(generateWarning(configResult));
        if (!input.dryRun) {
          await pm.x("astro add @qwik.dev/astro", { cwd: input.absDir });
        } else {
          this.info(`Would run: astro add @qwik.dev/astro via ${pm.name}`);
        }
        const strategy = determineJsxStrategy("primary");
        await scaffoldQwikComponent(input.absDir, strategy, input.dryRun);
        this.outro("Qwik added successfully!");
        return 0;
      }

      // outcome === "safe" — prompt for JSX strategy, rewrite config, scaffold
      const choice = await this.scanChoice(
        "Should Qwik be the primary JSX source?",
        [
          { value: "primary", label: "Yes — Qwik owns tsconfig jsxImportSource" },
          { value: "secondary", label: "No — keep existing framework as primary" }
        ],
        "secondary"
      ) as "primary" | "secondary";

      const strategy = determineJsxStrategy(choice);
      const rewrittenSource = rewriteConfig(configSource, configResult);

      if (rewrittenSource !== null) {
        if (!input.dryRun) {
          writeFileSync(configPath, rewrittenSource, "utf-8");
        } else {
          this.info(`Would rewrite: ${configPath}`);
        }
      }

      await scaffoldQwikComponent(input.absDir, strategy, input.dryRun);

      if (!input.dryRun) {
        await pm.x("astro add @qwik.dev/astro", { cwd: input.absDir });
      } else {
        this.info(`Would run: astro add @qwik.dev/astro via ${pm.name}`);
      }

      this.outro("Qwik added successfully!");
      return 0;
    } catch (err) {
      this.error(String(err));
      return 1;
    }
  }
}

export function add(
  name = pkg.name,
  version = pkg.version
): AddCommand {
  return new AddCommand(name, version);
}

export default add();
