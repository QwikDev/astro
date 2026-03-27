import pkg from "../package.json";
import pm from "panam/pm";
import { type Definition as BaseDefinition, Program } from "./core";
import { validateProject, checkGitStatus } from "./upgrade-preflight";
import {
  rewriteImports,
  rewriteTsconfig,
  rewriteAstroConfig,
  rewritePragmaComments,
  scanForAsyncPatterns
} from "./upgrade-rewrite";
import { resolveAbsoluteDir, getPackageJson } from "./utils";

export type UpgradeDefinition = BaseDefinition & {
  directory: string;
  dryRun?: boolean;
};

export type UpgradeResults = {
  dryRun: boolean;
  astroUpgradeRan: boolean;
  removedPackages: string[];
  installedPackages: string[];
  configChanges: { file: string; replacements: string[] }[];
  tsconfigChanged: boolean;
  sourceFilesChanged: string[];
  asyncWarnings: { file: string; line: number; pattern: string }[];
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
    const results: UpgradeResults = {
      dryRun: input.dryRun,
      astroUpgradeRan: false,
      removedPackages: [],
      installedPackages: [],
      configChanges: [],
      tsconfigChanged: false,
      sourceFilesChanged: [],
      asyncWarnings: []
    };

    try {
      this.intro("Upgrading Qwik + Astro project...");

      // Step 1: Delegate to @astrojs/upgrade
      this.step("Running @astrojs/upgrade...");
      if (!input.dryRun) {
        try {
          await pm.x("@astrojs/upgrade", { cwd: input.absDir });
          results.astroUpgradeRan = true;
        } catch {
          this.warn("@astrojs/upgrade failed or is unavailable — continuing with Qwik-specific migration.");
        }
      } else {
        this.info(`Would run @astrojs/upgrade via ${pm.name}`);
      }

      // Step 2: Swap packages
      this.step("Swapping Qwik packages...");
      const OLD_PACKAGES = ["@builder.io/qwik", "@builder.io/qwik-city", "@qwikdev/astro"];
      const NEW_PACKAGES = ["@qwik.dev/astro@latest", "@qwik.dev/core@latest"];

      let pkgJson: Record<string, any> = {};
      try {
        pkgJson = getPackageJson(input.absDir);
      } catch {
        // No package.json — skip package swap
      }

      const allDeps = {
        ...((pkgJson.dependencies as Record<string, string> | undefined) ?? {}),
        ...((pkgJson.devDependencies as Record<string, string> | undefined) ?? {}),
        ...((pkgJson.peerDependencies as Record<string, string> | undefined) ?? {})
      };

      const toRemove = OLD_PACKAGES.filter((pkg) => pkg in allDeps);

      if (!input.dryRun) {
        if (toRemove.length > 0) {
          try {
            await pm.x(`remove ${toRemove.join(" ")}`, { cwd: input.absDir });
          } catch {
            this.warn(`Failed to remove old packages: ${toRemove.join(", ")}`);
          }
        }
        try {
          await pm.x(`add ${NEW_PACKAGES.join(" ")}`, { cwd: input.absDir });
          results.removedPackages = toRemove;
          results.installedPackages = NEW_PACKAGES;
        } catch {
          this.warn("Failed to install new packages. Run manually: " + NEW_PACKAGES.join(" "));
        }
      } else {
        if (toRemove.length > 0) {
          this.info(`Would remove: ${toRemove.join(", ")}`);
        }
        this.info(`Would install: ${NEW_PACKAGES.join(", ")}`);
        results.removedPackages = toRemove;
        results.installedPackages = NEW_PACKAGES;
      }

      // Step 3: Rewrite astro.config
      this.step("Rewriting astro.config...");
      const configResult = rewriteAstroConfig(input.absDir, input.dryRun);
      if (configResult.changed && configResult.filePath) {
        results.configChanges.push({ file: configResult.filePath, replacements: configResult.replacements });
        this.info(`Updated: ${configResult.filePath} (${configResult.replacements.join(", ")})`);
      } else if (configResult.filePath) {
        this.info("astro.config already up-to-date.");
      } else {
        this.info("No astro.config file found — skipped.");
      }

      // Step 4: Rewrite tsconfig
      this.step("Rewriting tsconfig.json...");
      const tsconfigResult = rewriteTsconfig(input.absDir, input.dryRun);
      results.tsconfigChanged = tsconfigResult.changed;
      if (tsconfigResult.changed) {
        this.info(`Updated jsxImportSource: ${tsconfigResult.oldValue} -> ${tsconfigResult.newValue}`);
      } else {
        this.info("tsconfig.json already up-to-date or not found.");
      }

      // Step 5: Rewrite source file imports
      this.step("Rewriting source file imports...");
      const importsResult = rewriteImports(input.absDir, input.dryRun);
      if (importsResult.changedFiles.length > 0) {
        this.info(`Updated ${importsResult.changedFiles.length} source file(s).`);
      } else {
        this.info("No source file imports needed updating.");
      }

      // Step 6: Rewrite @jsxImportSource pragma comments
      this.step("Updating @jsxImportSource pragma comments...");
      const pragmaResult = rewritePragmaComments(input.absDir, input.dryRun);
      if (pragmaResult.changedFiles.length > 0) {
        this.info(`Updated pragma comments in ${pragmaResult.changedFiles.length} file(s).`);
      } else {
        this.info("No pragma comments needed updating.");
      }

      // Merge unique changed source files from both steps
      const allChangedFiles = new Set([...importsResult.changedFiles, ...pragmaResult.changedFiles]);
      results.sourceFilesChanged = Array.from(allChangedFiles);

      // Step 7: Scan for async patterns
      this.step("Checking for deprecated patterns...");
      const asyncWarnings = scanForAsyncPatterns(input.absDir);
      results.asyncWarnings = asyncWarnings;
      for (const warning of asyncWarnings) {
        this.warn(
          `${warning.file}:${warning.line} — async ${warning.pattern} may behave differently in Qwik v2. See migration docs.`
        );
      }
      if (asyncWarnings.length === 0) {
        this.info("No deprecated async patterns found.");
      }

      this.printSummary(results);

      return 0;
    } catch (err) {
      this.error(String(err));
      return 1;
    }
  }

  private printSummary(_results: UpgradeResults): void {
    // Implemented in Task 2
  }
}

export function upgrade(
  name = pkg.name,
  version = pkg.version
): UpgradeCommand {
  return new UpgradeCommand(name, version);
}

export default upgrade();
