import pm from "panam/pm";
import pkg from "../package.json" with { type: "json" };
import { type Definition as BaseDefinition, Program } from "./core";
import { checkGitStatus, validateProject } from "./upgrade-preflight";
import {
  rewriteAstroConfig,
  rewriteImports,
  rewritePragmaComments,
  rewriteTsconfig,
  scanForAsyncPatterns
} from "./upgrade-rewrite";
import { assertPmResult, getPackageJson, npmSpec, resolveAbsoluteDir } from "./utils";

const MIGRATION_DOCS_URL = "https://qwikdev-build-v2.qwik-8nx.pages.dev/docs/upgrade/";

/**
 * The exact command a user should run to retry `@astrojs/upgrade` by hand,
 * spelled the same way `pm.dlx()` spells it for the detected package manager.
 */
function astroUpgradeCommand(): string {
  const spec = npmSpec("@astrojs/upgrade");

  if (pm.isDeno()) {
    return `deno run -A -r ${spec}`;
  }

  if (pm.isPnpm() || pm.isYarn()) {
    return `${pm.name} dlx ${spec}`;
  }

  return `${pm.name} x ${spec}`;
}

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
        this.cancel(
          "Aborting upgrade due to uncommitted changes. Please commit or stash your changes first."
        );
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
          const dlxResult = await pm.dlx(npmSpec("@astrojs/upgrade"), {
            cwd: input.absDir
          });
          assertPmResult(dlxResult, "@astrojs/upgrade");
          results.astroUpgradeRan = true;
        } catch {
          // Failures in this third-party updater are advisory, not fatal: its own
          // message prescribes a manual fallback, and runtime-specific breakage in
          // Astro's tool (e.g. its `deno add astro@x` path) must not block the Qwik
          // migration — swapping packages and rewriting imports is this CLI's job.
          this.warn(
            `@astrojs/upgrade failed. Continuing with the Qwik upgrade — please run it manually: ${astroUpgradeCommand()}`
          );
        }
      } else {
        this.info(`Would run @astrojs/upgrade via ${pm.name}`);
      }

      // Step 2: Swap packages
      const failures: string[] = [];
      this.step("Swapping Qwik packages...");
      // (import rewriting, replacement package install) is out of scope.
      // Removing it without migration would break apps that depend on it.
      const oldPackages = ["@builder.io/qwik", "@qwikdev/astro"];
      const newPackages = ["@qwik.dev/astro@latest", "@qwik.dev/core@latest"];

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

      const toRemove = oldPackages.filter((pkg) => pkg in allDeps);

      if (!input.dryRun) {
        if (toRemove.length > 0) {
          try {
            const removeResult = await pm.remove(toRemove, { cwd: input.absDir });
            assertPmResult(removeResult, `remove old packages: ${toRemove.join(", ")}`);
          } catch {
            failures.push(`Failed to remove old packages: ${toRemove.join(", ")}`);
            this.warn(`Failed to remove old packages: ${toRemove.join(", ")}`);
          }
        }
        try {
          const addResult = await pm.add(newPackages, { cwd: input.absDir });
          assertPmResult(addResult, `install new packages: ${newPackages.join(", ")}`);
          results.removedPackages = toRemove;
          results.installedPackages = newPackages;
        } catch {
          failures.push(`Failed to install new packages: ${newPackages.join(" ")}`);
          this.warn(
            `Failed to install new packages. Run manually: ${newPackages.join(" ")}`
          );
        }
      } else {
        if (toRemove.length > 0) {
          this.info(`Would remove: ${toRemove.join(", ")}`);
        }
        this.info(`Would install: ${newPackages.join(", ")}`);
        results.removedPackages = toRemove;
        results.installedPackages = newPackages;
      }

      // Bail if package swap failed — config/import rewriting on inconsistent
      // packages would leave the project in a broken state
      if (failures.length > 0) {
        this.error("Package migration failed:");
        for (const f of failures) {
          this.error(`  - ${f}`);
        }
        this.error("Please resolve manually before continuing.");
        return 1;
      }

      // Step 3: Rewrite astro.config
      this.step("Rewriting astro.config...");
      const configResult = rewriteAstroConfig(input.absDir, input.dryRun);
      if (configResult.changed && configResult.filePath) {
        results.configChanges.push({
          file: configResult.filePath,
          replacements: configResult.replacements
        });
        this.info(
          `Updated: ${configResult.filePath} (${configResult.replacements.join(", ")})`
        );
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
        this.info(
          `Updated jsxImportSource: ${tsconfigResult.oldValue} -> ${tsconfigResult.newValue}`
        );
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
        this.info(
          `Updated pragma comments in ${pragmaResult.changedFiles.length} file(s).`
        );
      } else {
        this.info("No pragma comments needed updating.");
      }

      // Merge unique changed source files from both steps
      const allChangedFiles = new Set([
        ...importsResult.changedFiles,
        ...pragmaResult.changedFiles
      ]);
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

  private printSummary(results: UpgradeResults): void {
    const lines: string[] = [];

    if (results.dryRun) {
      // Dry-run mode: list planned actions with "[would]" prefix
      lines.push(`${this.cyan("[would]")} Run @astrojs/upgrade`);

      if (results.removedPackages.length > 0) {
        lines.push(
          `${this.cyan("[would]")} Remove: ${results.removedPackages.join(", ")}`
        );
      }
      lines.push(
        `${this.cyan("[would]")} Install: ${results.installedPackages.join(", ")}`
      );

      if (results.configChanges.length > 0) {
        for (const change of results.configChanges) {
          lines.push(`${this.cyan("[would]")} Rewrite: ${change.file}`);
        }
      }

      if (results.tsconfigChanged) {
        lines.push(`${this.cyan("[would]")} Rewrite: tsconfig.json jsxImportSource`);
      }

      if (results.sourceFilesChanged.length > 0) {
        lines.push(
          `${this.cyan("[would]")} Rewrite imports in ${results.sourceFilesChanged.length} source file(s):`
        );
        for (const file of results.sourceFilesChanged) {
          lines.push(`  ${this.gray(file)}`);
        }
      }

      if (results.asyncWarnings.length > 0) {
        lines.push("");
        lines.push(this.yellow("Async pattern warnings:"));
        for (const w of results.asyncWarnings) {
          lines.push(this.yellow(`  ${w.file}:${w.line} — async ${w.pattern}`));
        }
      }

      lines.push("");
      lines.push(this.gray("No files were modified. Run without --dry-run to apply."));

      this.note(lines.join("\n"), "Dry Run Report");
      this.outro("Dry run complete");
    } else {
      // Actual run: summarize what changed
      lines.push(this.cyan("Packages:"));
      lines.push(
        `  Removed: ${results.removedPackages.length > 0 ? results.removedPackages.join(", ") : this.gray("None")}`
      );
      lines.push(`  Installed: ${results.installedPackages.join(", ")}`);

      const changedFiles: string[] = [];
      for (const change of results.configChanges) {
        changedFiles.push(change.file);
      }
      if (results.tsconfigChanged) {
        changedFiles.push("tsconfig.json");
      }
      for (const file of results.sourceFilesChanged) {
        changedFiles.push(file);
      }

      lines.push("");
      lines.push(this.cyan("Files changed:"));
      if (changedFiles.length > 0) {
        for (const file of changedFiles) {
          lines.push(`  ${file}`);
        }
      } else {
        lines.push(`  ${this.gray("No files modified.")}`);
      }

      if (results.asyncWarnings.length > 0) {
        lines.push("");
        lines.push(this.yellow("Warnings:"));
        lines.push(
          this.yellow("  Async useComputed$ and useResource$ behavior changed in Qwik v2")
        );
        for (const w of results.asyncWarnings) {
          lines.push(
            this.yellow(`  ${w.file}:${w.line} — async ${w.pattern} may need review`)
          );
        }
      }

      lines.push("");
      lines.push(this.cyan("Next steps:"));
      lines.push("  Review changed files");
      lines.push(`  Run your project: ${this.gray(`${pm.name} run dev`)}`);
      lines.push(`  Migration docs: ${this.gray(MIGRATION_DOCS_URL)}`);
      lines.push(
        `  Update ecosystem packages: ${this.gray("@qwik-ui/headless, @qwikest/icons, etc. to latest versions")}`
      );

      this.note(lines.join("\n"), "Upgrade Summary");
      this.outro("Upgrade complete!");
    }
  }
}

export function upgrade(name = pkg.name, version = pkg.version): UpgradeCommand {
  return new UpgradeCommand(name, version);
}

export default upgrade();
