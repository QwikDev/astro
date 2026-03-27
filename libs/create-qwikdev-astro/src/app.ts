import fs, { cpSync } from "node:fs";
import path from "node:path";
import { copySync, ensureDirSync, pathExistsSync } from "fs-extra/esm";
import { $ } from "panam/executor";
import pm from "panam/pm";
import pkg from "../package.json";
import {
	detectConfigFrameworks,
	hasQwikImport,
	isQwikRegistered,
} from "./add-flow/detect-config";
import { determineJsxStrategy } from "./add-flow/jsx-strategy";
import { generateWarning, rewriteConfig } from "./add-flow/rewrite-config";
import { scaffoldQwikComponent } from "./add-flow/scaffold";
import { ensureString } from "./console";
import { type Definition as BaseDefinition, Program } from "./core";
import {
	__dirname,
	assertPmResult,
	clearDir,
	getPackageJson,
	notEmptyDir,
	replacePackageJsonRunCommand,
	resolveAbsoluteDir,
	resolveRelativeDir,
	safeCopy,
	sanitizePackageName,
	stripJsonComments,
	updatePackageName,
} from "./utils";

export type Definition = BaseDefinition & {
	destination: string;
	adapter: Adapter;
	template?: string;
	add?: boolean;
	force?: boolean;
	copy?: boolean;
	biome?: boolean;
	install?: boolean;
	git?: boolean;
	ci?: boolean;
	dryRun?: boolean;
};

export type EnsureRequired<T, K extends keyof T> = Omit<T, K> &
	Required<Pick<T, K>>;
export type UserDefinition = Partial<Definition>;

export const defaultDefinition = {
	destination: "./qwik-astro-app",
	adapter: "none",
	template: undefined,
	add: undefined,
	force: undefined,
	copy: undefined,
	biome: undefined,
	install: undefined,
	git: undefined,
	ci: undefined,
	yes: undefined,
	no: undefined,
	dryRun: undefined,
} as const;

export type Adapter = "node" | "deno" | "none";

export type Input = Required<Omit<Definition, "yes" | "no">> & {
	outDir: string;
	packageName: string;
};

export function defineDefinition(definition: UserDefinition): Definition {
	return { ...defaultDefinition, ...definition };
}

export class Application extends Program<Definition, Input> {
	configure(): void {
		this.strict()
			.interactive()
			.alias("h", "help")
			.useYes()
			.useNo()
			.conflict("add", "force")
			.command(
				"* [destination] [adapter]",
				"Create a new project powered by QwikDev/astro",
			)
			.argument("destination", {
				type: "string",
				default: defaultDefinition.destination,
				desc: "Directory of the project",
			})
			.argument("adapter", {
				type: "string",
				default: defaultDefinition.adapter,
				desc: "Server adapter",
				choices: ["deno", "node", "none"],
			})
			.argument("template", {
				alias: "t",
				type: "string",
				default: defaultDefinition.template,
				desc: "Start from an Astro template",
			})
			.option("add", {
				alias: "a",
				type: "boolean",
				default: defaultDefinition.add,
				desc: "Add @qwik.dev/astro to existing project",
			})
			.option("force", {
				alias: "f",
				type: "boolean",
				default: defaultDefinition.force,
				desc: "Overwrite target directory if it exists",
			})
			.option("copy", {
				alias: "c",
				type: "boolean",
				default: defaultDefinition.copy,
				desc: "Copy files without overwriting",
			})
			.option("install", {
				alias: "i",
				type: "boolean",
				default: defaultDefinition.install,
				desc: "Install dependencies",
			})
			.option("biome", {
				type: "boolean",
				default: defaultDefinition.biome,
				desc: "Prefer Biome to ESLint/Prettier",
			})
			.option("git", {
				type: "boolean",
				default: defaultDefinition.git,
				desc: "Use Git to save changes",
			})
			.option("ci", {
				type: "boolean",
				default: defaultDefinition.ci,
				desc: "Add CI workflow",
			})
			.option("dryRun", {
				type: "boolean",
				desc: "Walk through steps without executing",
			})
			.example(
				"npm create @qwik.dev/astro@latest",
				"Create a project with default options",
			)
			.example(
				"npm create @qwik.dev/astro@latest ./qwik-astro-app",
				"Create a project in a specific directory",
			)
			.example(
				"npm create @qwik.dev/astro@latest ./qwik-astro-app node",
				"Create a project using a server adapter",
			)
			.example(
				"npm create @qwik.dev/astro@latest ./qwik-astro-app node --it",
				"Create a project in interactive command mode",
			)
			.usage("npm create @qwik.dev/astro [destination] [adapter] [...options]");
	}

	parse(args: string[]): Definition {
		return defineDefinition(super.parse(args));
	}

	validate(definition: Definition): Input {
		const destination =
			definition.add && definition.destination === defaultDefinition.destination
				? "./"
				: definition.destination;
		return {
			destination,
			adapter: definition.adapter,
			template: definition.template ?? "",
			add: !!definition.add,
			force:
				definition.force ??
				(definition.add ? false : !!definition.yes && !definition.no),
			copy: !!definition.copy,
			biome: definition.biome ?? (!!definition.yes && !definition.no),
			install:
				definition.install ??
				(!!definition.template || (!!definition.yes && !definition.no)),
			ci: definition.ci ?? (!!definition.yes && !definition.no),
			git: definition.git ?? (!!definition.yes && !definition.no),
			dryRun: !!definition.dryRun,
			outDir: resolveAbsoluteDir(destination),
			packageName:
				sanitizePackageName(destination) ||
				sanitizePackageName(
					path.basename(resolveAbsoluteDir(destination)),
				),
		};
	}

	async interact(definition: Definition): Promise<Input> {
		let destination = definition.destination;
		if (destination === defaultDefinition.destination) {
			const defaultDest = definition.add ? "./" : definition.destination;
			destination = await this.scanString(
				`Where would you like to ${definition.add ? "add @qwik.dev/astro" : "create your new project"}? ${this.gray(
					`(Use './' for current directory)`,
				)}`,
				defaultDest,
			);
		}

		const outDir = resolveAbsoluteDir(destination.trim());
		const exists = notEmptyDir(outDir);

		const add = definition.force
			? false
			: await this.confirmOption(
					definition,
					definition.add,
					exists,
					"Do you want to add @qwik.dev/astro to your existing project?",
				);

		const force = await this.confirmOption(
			definition,
			definition.force,
			exists && !add,
			`Directory "./${resolveRelativeDir(outDir)}" already exists and is not empty. Would you like to force the copy?`,
			false,
		);

		const shouldPrompt = !exists || add || force;

		let template = definition.template ?? "";
		let adapter: Adapter = definition.adapter;

		const shouldPromptStarter =
			definition.template === undefined &&
			shouldPrompt &&
			(!add || force) &&
			definition.adapter === defaultDefinition.adapter;

		if (shouldPromptStarter) {
			const starter = await this.scanChoice<Adapter | "template">(
				"How would you like to start?",
				[
					{ value: "none", label: "Default starter (Qwik + Astro)" },
					{ value: "node", label: "With Node.js server adapter" },
					{ value: "deno", label: "With Deno server adapter" },
					{ value: "template", label: "From an Astro template" },
				],
				"none" as Adapter | "template",
			);

			if (starter === "template") {
				template = await this.scanString(
					`Which Astro template? ${this.gray("(e.g. minimal, blog, starlight)")}`,
					"minimal",
				);
			} else {
				ensureString(starter, (v): v is Adapter =>
					["none", "node", "deno"].includes(v),
				);
				adapter = starter as Adapter;
			}
		}

		const shouldAskCopy = !template && (add || force);
		const copy = await this.confirmOption(
			definition,
			definition.copy,
			shouldAskCopy,
			"Copy template files safely (without overwriting existing files)?",
			!add,
		);

		const biome = await this.confirmOption(
			definition,
			definition.biome,
			shouldPrompt && !add,
			"Would you prefer Biome over ESLint/Prettier?",
		);

		let install: boolean;
		if (template) {
			if (definition.install === false) {
				this.error(
					"Astro templates require dependency installation to add @qwik.dev/astro. Remove --no-install or use a starter template instead.",
				);
				this.cancel();
				process.exit(1);
			}
			install = true;
		} else {
			install = await this.confirmOption(
				definition,
				definition.install,
				shouldPrompt,
				`Would you like to install ${pm.name} dependencies?`,
			);
		}

		const gitMessage =
			!exists || force
				? "Would you like to initialize Git?"
				: "Would you like to save the changes with Git?";
		const git = await this.confirmOption(
			definition,
			definition.git,
			shouldPrompt,
			gitMessage,
		);

		const ci = await this.confirmOption(
			definition,
			definition.ci,
			shouldPrompt,
			"Would you like to add CI workflow?",
		);

		const fallbackName =
			sanitizePackageName(destination) ||
			sanitizePackageName(path.basename(outDir));
		const hasPackageJson =
			exists && fs.existsSync(path.join(outDir, "package.json"));
		const packageName =
			hasPackageJson && (!force || copy)
				? getPackageJson(outDir).name
				: fallbackName;

		return {
			destination,
			adapter,
			template,
			biome,
			ci,
			install,
			git,
			add,
			force,
			copy,
			outDir,
			packageName,
			dryRun: definition.dryRun ?? false,
		};
	}

	async execute(input: Input): Promise<number> {
		if (input.template && !input.install) {
			this.error(
				"Astro templates require dependency installation to add @qwik.dev/astro. Remove --no-install or use a starter template instead.",
			);
			return 1;
		}

		try {
			const ranInstall = await this.start(input);
			this.updatePackageJson(input);
			this.runCI(input);
			await this.runGit(input);
			this.end(input, ranInstall);
			return 0;
		} catch (err) {
			console.error(
				"An error occurred during @qwik.dev/astro project creation:",
				err,
			);
			return 1;
		}
	}

	async runAdd(input: Input) {
		this.info("Adding @qwik.dev/astro...");
		try {
			// Step 1: Locate astro.config file
			const configExts = [".mts", ".ts", ".mjs", ".js"];
			let configPath: string | null = null;
			let configSource: string | null = null;

			for (const ext of configExts) {
				const candidate = path.join(input.outDir, `astro.config${ext}`);
				if (fs.existsSync(candidate)) {
					configPath = candidate;
					configSource = fs.readFileSync(candidate, "utf-8");
					break;
				}
			}

			// Step 2: Pre-install and registration checks (existing behavior)
			const needsPreInstall =
				configSource !== null && hasQwikImport(configSource);
			const alreadyRegistered =
				configSource !== null && isQwikRegistered(configSource);

			if (!input.dryRun && needsPreInstall) {
				this.info(
					"@qwik.dev/astro found in config — installing before astro add.",
				);
				assertPmResult(
					await pm.add(["@qwik.dev/astro", "@qwik.dev/core"], {
						cwd: input.outDir,
					}),
					"pm.add @qwik.dev/astro",
				);
			}

			// Step 3: Multi-framework detection
			if (configSource !== null) {
				const configResult = detectConfigFrameworks(configSource);

				if (configResult.outcome === "safe") {
					// Prompt for JSX strategy
					const choice = (await this.scanChoice(
						"Should Qwik be the primary JSX source?",
						[
							{
								value: "primary",
								label: "Yes — Qwik owns tsconfig jsxImportSource",
							},
							{
								value: "secondary",
								label: "No — keep existing framework as primary",
							},
						],
						"primary",
					)) as "primary" | "secondary";

					const strategy = determineJsxStrategy(choice);

					// Persist tsconfig change if primary
					this.persistTsconfigForAdd(input, strategy);

					// Rewrite config with exclude patterns
					const rewrittenSource = rewriteConfig(configSource, configResult);
					if (
						rewrittenSource !== null &&
						configPath !== null &&
						!input.dryRun
					) {
						fs.writeFileSync(configPath, rewrittenSource, "utf-8");
					}

					// Scaffold Qwik component
					await scaffoldQwikComponent(input.outDir, strategy, input.dryRun);

					// Install qwik via astro add (or skip if already registered)
					if (!input.dryRun) {
						if (alreadyRegistered) {
							this.info(
								"@qwik.dev/astro already registered in config — skipping astro add.",
							);
						} else {
							assertPmResult(
								await pm.x("astro add @qwik.dev/astro", { cwd: input.outDir }),
								"astro add @qwik.dev/astro",
							);
						}
					}
				} else if (
					configResult.outcome === "unsafe" ||
					configResult.outcome === "already-configured"
				) {
					// Warn and proceed without auto-config
					this.warn(generateWarning(configResult));
					const strategy = determineJsxStrategy("secondary");
					await scaffoldQwikComponent(input.outDir, strategy, input.dryRun);

					if (!input.dryRun) {
						if (alreadyRegistered) {
							this.info(
								"@qwik.dev/astro already registered in config — skipping astro add.",
							);
						} else {
							assertPmResult(
								await pm.x("astro add @qwik.dev/astro", { cwd: input.outDir }),
								"astro add @qwik.dev/astro",
							);
						}
					}
				} else {
					// outcome === "none" — no other frameworks, add as primary
					if (!input.dryRun) {
						if (alreadyRegistered) {
							this.info(
								"@qwik.dev/astro already registered in config — skipping astro add.",
							);
						} else {
							assertPmResult(
								await pm.x("astro add @qwik.dev/astro", { cwd: input.outDir }),
								"astro add @qwik.dev/astro",
							);
						}
					}
					const strategy = determineJsxStrategy("primary");
					this.persistTsconfigForAdd(input, strategy);
					await scaffoldQwikComponent(input.outDir, strategy, input.dryRun);
				}
			} else {
				// No config file found — just run astro add directly
				if (!input.dryRun) {
					assertPmResult(
						await pm.x("astro add @qwik.dev/astro", { cwd: input.outDir }),
						"astro add @qwik.dev/astro",
					);
				}
				const strategy = determineJsxStrategy("primary");
				this.persistTsconfigForAdd(input, strategy);
				await scaffoldQwikComponent(input.outDir, strategy, input.dryRun);
			}

			if (input.copy) {
				this.copyTemplate(input);
			}
		} catch (e: any) {
			this.panic(`${e.message ?? e}: . Please try it manually.`);
		}
	}

	private persistTsconfigForAdd(
		input: Input,
		strategy: import("./add-flow/jsx-strategy.js").JsxStrategy,
	): void {
		if (strategy.tsconfigSource === null) return;

		const tsconfigPath = path.join(input.outDir, "tsconfig.json");
		if (!fs.existsSync(tsconfigPath)) return;

		const tsconfigRaw = fs.readFileSync(tsconfigPath, "utf-8");
		let tsconfig: any;
		try {
			tsconfig = JSON.parse(stripJsonComments(tsconfigRaw));
		} catch {
			return; // Can't parse even after stripping — don't touch it
		}
		tsconfig.compilerOptions = tsconfig.compilerOptions ?? {};
		tsconfig.compilerOptions.jsxImportSource = strategy.tsconfigSource;

		if (!input.dryRun) {
			fs.writeFileSync(
				tsconfigPath,
				`${JSON.stringify(tsconfig, null, 2)}\n`,
				"utf-8",
			);
		}
	}

	async prepareDir(input: Input) {
		const outDir = input.outDir;

		if (notEmptyDir(outDir)) {
			if (input.force) {
				if (input.copy) {
					this.info(`Directory "${outDir}" already exists. Copy safely...🚚`);
				} else {
					if (!input.dryRun) {
						await clearDir(outDir);
					}
					this.info(`Directory "${outDir}" successfully emptied 🔥`);
				}
			} else {
				this.error(`Directory "${outDir}" already exists.`);
				this.info(
					`Please either remove this directory, choose another location or run the command again with '--force | -f' flag.`,
				);
				this.cancel();
				process.exit(1);
			}
		}
	}

	async runCreate(input: Input) {
		await this.prepareDir(input);
		this.copyTemplate(input);
	}

	async runTemplate(input: Input) {
		const args = [
			"astro",
			input.destination,
			"--",
			"--skip-houston",
			"--template",
			input.template,
			"--add",
			"@qwik.dev/astro",
			"--install",
			input.git ? "--git" : "--no-git",
		];

		if (input.dryRun) args.push("--dry-run");

		await this.prepareDir(input);

		const res = await pm.create(args.join(" "));
		if (!res.status) this.panic(`Template creation failed: ${res.error}`);

		this.copyTools(input);
		return true;
	}

	private async confirmOption(
		definition: Definition,
		flag: boolean | undefined,
		shouldAsk: boolean,
		message: string,
		initialValue?: boolean,
	): Promise<boolean> {
		if (flag !== undefined) return flag;
		if (!shouldAsk) return false;

		const response =
			initialValue !== undefined
				? await this.scanBoolean(definition, message, initialValue)
				: await this.scanBoolean(definition, message);

		return response ?? false;
	}

	async start(input: Input): Promise<boolean> {
		this.intro(
			`Let's create a ${this.bgBlue(" QwikDev")}${this.bgMagenta("Astro")} App ✨`,
		);

		let ranInstall: boolean;

		if (input.template) {
			ranInstall = await this.runTemplate(input);
		} else if (input.add) {
			ranInstall = await this.runInstall(input);
			await this.runAdd(input);
		} else {
			await this.runCreate(input);
			ranInstall = await this.runInstall(input);
		}

		return ranInstall;
	}

	end(input: Input, ranInstall: boolean): void {
		const outDir = input.outDir;
		const isCwdDir = process.cwd() === outDir;
		const relativeProjectPath = resolveRelativeDir(outDir);
		const outString = [];

		if (isCwdDir) {
			outString.push(`🦄 ${this.bgMagenta(" Success! ")}`);
		} else {
			outString.push(
				`🦄 ${this.bgMagenta(" Success! ")} ${this.cyan(
					"Project created in",
				)} ${this.bold(this.magenta(relativeProjectPath))} ${this.cyan("directory")}`,
			);
		}
		outString.push("");

		outString.push(`🐰 ${this.cyan("Next steps:")}`);
		if (!isCwdDir) {
			outString.push(`   cd ${relativeProjectPath}`);
		}
		if (!ranInstall) {
			outString.push(`   ${pm.name} install`);
		}
		outString.push(`   ${pm.name} start`);

		this.note(outString.join("\n"), "Ready to start 🚀");

		this.outro("Happy coding! 💻🎉");
	}

	updatePackageJson(input: Input): void {
		const { outDir, packageName } = input;

		updatePackageName(packageName as string, outDir);
		this.info(`Updated package name to "${packageName}" 📦️`);

		if (!pm.isNpm()) {
			this.info(
				`Replacing 'npm run' by '${pm.runCommand()}' in package.json...`,
			);
			replacePackageJsonRunCommand(outDir);
		}
	}

	runCI(input: Input): void {
		if (input.ci) {
			this.step("👷 Adding CI workflow...");

			if (!input.dryRun) {
				const starterCIPath = path.join(
					__dirname,
					"..",
					"stubs",
					"workflows",
					`${pm.in(["npm", "yarn", "pnpm", "bun"]) ? pm.name : "npm"}-ci.yml`,
				);
				const projectCIPath = path.join(
					input.outDir,
					".github",
					"workflows",
					"ci.yml",
				);
				cpSync(starterCIPath, projectCIPath, { force: true });
			}
		}
	}

	async runInstall(input: Input): Promise<boolean> {
		let ranInstall = false;

		if (input.install) {
			this.step(`Installing${input.template ? " new " : " "}dependencies...`);

			if (!input.dryRun) {
				try {
					const installResult = await pm.install({ cwd: input.outDir });
					assertPmResult(installResult, "install dependencies");
				} catch (e) {
					this.error(`Dependency installation failed: ${e instanceof Error ? e.message : e}`);
					return false;
				}
			}

			ranInstall = true;
		}

		return ranInstall;
	}

	async runGit(input: Input): Promise<void> {
		if (input.git) {
			const s = this.spinner();

			const outDir = input.outDir;
			const initialized = fs.existsSync(path.join(outDir, ".git"));
			const addChanges = initialized || input.add;
			if (initialized) {
				this.info("Git has already been initialized before.");
			}

			s.start(
				`${addChanges ? "Adding New Changes to" : "Initializing"} Git...`,
			);

			if (!input.dryRun) {
				const res = [];
				try {
					if (!initialized) {
						res.push(await $("git", ["init"], { cwd: outDir }).result);
					}
					res.push(await $("git", ["add", "-A"], { cwd: outDir }).result);
					res.push(
						await $(
							"git",
							[
								"commit",
								"-m",
								`${addChanges ? "➕ Add @qwik.dev/astro" : "Initial commit 🎉"}`,
							],
							{ cwd: outDir },
						).result,
					);

					if (res.some((r) => r.status === false)) {
						throw "";
					}

					s.stop(
						`${addChanges ? "Changes added to Git ✨" : "Git initialized 🎲"}`,
					);
				} catch (e) {
					s.stop(
						`Git failed to ${addChanges ? "add new changes" : "initialize"}`,
					);
					if (!initialized) {
						this.error(
							"Git failed to initialize. You can do this manually by running: git init",
						);
					} else {
						this.error(
							"Git failed to add new changes. You can do this manually by running: git add -A && git commit",
						);
					}
				}
			}
		}
	}

	copyTools(input: Input) {
		for (const filename of [
			...(input.biome
				? ["biome.json", "tsconfig.biome.json"]
				: [
						".eslintignore",
						".eslintrc.cjs",
						".prettierignore",
						"prettier.config.cjs",
						"tsconfig.json",
					]),
			"gitignore",
			"README.md",
		]) {
			let outfile = filename;

			if (filename === "gitignore") {
				outfile = ".gitignore";
			}
			if (filename.startsWith("tsconfig.")) {
				outfile = "tsconfig.json";
			}
			const outpath = path.join(input.outDir, outfile);
			const exists = pathExistsSync(outpath);
			if (filename.startsWith(".") && filename.endsWith("ignore")) {
				this.step(
					`${exists ? "Merging" : "Copying"} \`${outfile}\` file... 🙈`,
				);
			}

			if (!input.dryRun) {
				const origin = path.join(__dirname, "..", "stubs", "tools", filename);
				safeCopy(origin, outpath);
			}
		}
	}

	copyTemplate(input: Input, templatePath?: string): void {
		this.step(
			`${input.add || input.template ? "Copying template files into" : "Creating new project in"} ${this.bgBlue(` ${input.outDir} `)} ... 🐇`,
		);

		if (!input.dryRun) {
			const outDir = input.outDir;
			try {
				ensureDirSync(outDir);

				if (!templatePath) {
					let starterKit = input.adapter;

					if (input.biome) {
						starterKit += "-biome";
					}

					templatePath = path.join(
						__dirname,
						"..",
						"stubs",
						"templates",
						starterKit,
					);
				}

				input.template || input.copy
					? safeCopy(templatePath, outDir)
					: copySync(templatePath, outDir);

				this.copyTools(input);
			} catch (error) {
				this.error(this.red(`Template copy failed: ${error}`));
			}
		}
	}
}

export function app(name = pkg.name, version = pkg.version): Application {
	return new Application(name, version);
}

export default app();
