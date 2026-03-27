import pkg from "../package.json";
import { type Definition as BaseDefinition, Program } from "./core";
import { validateProject, checkGitStatus } from "./upgrade-preflight";
import { resolveAbsoluteDir } from "./utils";

export type UpgradeDefinition = BaseDefinition & {
  directory: string;
  dryRun?: boolean;
};

export type UpgradeInput = {
  directory: string;
  absDir: string;
  dryRun: boolean;
  hasOldQwik: boolean;
  hasNewQwik: boolean;
};

export const defaultUpgradeDefinition = {
  directory: ".",
  dryRun: undefined,
  yes: undefined,
  no: undefined
} as const;

export function defineUpgradeDefinition(
  definition: Partial<UpgradeDefinition>
): UpgradeDefinition {
  return { ...defaultUpgradeDefinition, ...definition };
}

export class UpgradeCommand extends Program<UpgradeDefinition, UpgradeInput> {
  configure(): void {
    this.strict()
      .interactive()
      .alias("h", "help")
      .useYes()
      .useNo()
      .command("* [directory]", "Upgrade a 0.x Qwik + Astro project to 1.0")
      .argument("directory", {
        type: "string",
        default: defaultUpgradeDefinition.directory,
        desc: "Project directory to upgrade"
      })
      .option("dryRun", {
        type: "boolean",
        default: false,
        desc: "Show planned changes without modifying files"
      });
  }

  parse(args: string[]): UpgradeDefinition {
    return defineUpgradeDefinition(super.parse(args));
  }

  validate(definition: UpgradeDefinition): UpgradeInput {
    const absDir = resolveAbsoluteDir(definition.directory);
    const result = validateProject(absDir);

    if (!result.valid) {
      this.panic(result.reason ?? "Invalid project");
    }

    return {
      directory: definition.directory,
      absDir,
      dryRun: !!definition.dryRun,
      hasOldQwik: result.hasOldQwik,
      hasNewQwik: result.hasNewQwik
    };
  }

  async interact(definition: UpgradeDefinition): Promise<UpgradeInput> {
    let directory = definition.directory;

    if (directory === defaultUpgradeDefinition.directory) {
      directory = await this.scanString(
        `Which project directory would you like to upgrade? ${this.gray("(Use '.' for current directory)")}`,
        definition.directory
      );
    }

    const absDir = resolveAbsoluteDir(directory.trim());
    const validationResult = validateProject(absDir);

    if (!validationResult.valid) {
      this.panic(validationResult.reason ?? "Invalid project");
    }

    const gitStatus = await checkGitStatus(absDir);

    if (gitStatus.isDirty) {
      this.warn("Git working tree has uncommitted changes.");

      if (definition.no) {
        // --no flag: abort on dirty git
        this.cancel("Aborting upgrade due to uncommitted changes. Please commit or stash your changes first.");
        process.exit(0);
      }

      if (!definition.yes) {
        // Interactive: prompt user
        const continueAnyway = await this.scanBoolean(
          definition,
          "Git working tree has uncommitted changes. Continue anyway?",
          false
        );

        if (!continueAnyway) {
          this.cancel("Upgrade cancelled. Please commit or stash your changes first.");
          process.exit(0);
        }
      }
      // --yes flag: skip prompt, continue anyway
    }

    return {
      directory,
      absDir,
      dryRun: definition.dryRun ?? false,
      hasOldQwik: validationResult.hasOldQwik,
      hasNewQwik: validationResult.hasNewQwik
    };
  }

  async execute(input: UpgradeInput): Promise<number> {
    this.intro("Upgrading Qwik + Astro project...");

    this.step("Preflight checks passed");

    // TODO: Delegate to @astrojs/upgrade for Astro-level upgrades

    // TODO: Swap packages (@builder.io/qwik -> @qwik.dev/core, @qwikdev/astro -> @qwik.dev/astro)

    // TODO: Rewrite source files (update imports, API changes)

    // TODO: Print upgrade summary

    this.outro("Upgrade complete!");

    return 0;
  }
}

export function upgrade(
  name = pkg.name,
  version = pkg.version
): UpgradeCommand {
  return new UpgradeCommand(name, version);
}

export default upgrade();
