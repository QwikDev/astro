# Create [@qwik.dev/astro](https://github.com/QwikDev/astro) 🦾

## **The Ultimate Starter for QwikDev/Astro Projects**

Seamlessly scaffold content-driven web projects with the power of [QwikDev/Astro](https://github.com/QwikDev/astro).
Whether you're building blazing-fast blogs, portfolios, or scalable applications,
this CLI has you covered.

## Quickstart 🎉

### Have an existing project?

If you already have an existing Astro project and want to add the integration,
you can do so with the following command:

  ```bash
  npm create @qwik.dev/astro@latest add
  ```

### Create a new project

To create a brand new project,
you can use the following command:

  ```bash
  npm create @qwik.dev/astro@latest
  ```

### Upgrade from v1

If you have an existing v1 project (`@builder.io/qwik` + `@qwikdev/astro`),
you can upgrade to v2 with:

  ```bash
  npm create @qwik.dev/astro@latest upgrade
  ```

---

## 🚀 **Installation & Usage**

### 🧑‍💻 Usage

The CLI has three entry points:

#### Create a new project

```bash
npm create @qwik.dev/astro@latest [destination] [adapter] [...options]
```

#### Add Qwik to an existing Astro project

```bash
npm create @qwik.dev/astro@latest add [directory] [--dry-run] [--yes] [--no]
```

#### Upgrade a v1 project

```bash
npm create @qwik.dev/astro@latest upgrade [directory] [--dry-run] [--yes] [--no]
```

Replace `npm create` with `pnpm create`, `yarn create`, or `bun create`
if you prefer a different package manager.

### 🛠️ Command Reference

#### Create Arguments

Customize the create command with the following arguments:

  | Name        | Type                       | Default value    | Description                       |
  | :-----------| :--------------------------| :----------------| :---------------------------------|
  | destination | String                     | ./qwik-astro-app | Directory of the project.         |
  | adapter     | "deno" or "node" or "none" | none             | Server adapter.                   |

#### Create Options

Enhance your project setup with these additional flags:

  | Name                         | Shortcut        | Description                                    |
  | :--------------------------- | :---------------| :----------------------------------------------|
  | `--help`                     | `-h`            | Display all available options.                 |
  | `--template`                 | `-t`            | Use an Astro template.                         |
  | `--add` / `--no-add`         | `-a` / `--no-a` | Legacy add flow. Prefer the `add` subcommand.  |
  | `--force` / `--no-force`     | `-f` / `--no-f` | Overwrite target directory, if needed.         |
  | `--copy` / `--no-copy`       | `-c` / `--no-c` | Copy files without overwriting.                |
  | `--biome` / `--no-biome`     |                 | Use Biome instead of ESLint/Prettier.          |
  | `--install` / `--no-install` | `-i` / `--no-i` | Automatically install dependencies.            |
  | `--git` / `--no-git`         |                 | Use Git to save changes.                       |
  | `--ci` / `--no-ci`           |                 | Add CI workflow.                               |
  | `--yes`                      | `-y`            | Accept all default configurations.             |
  | `--no`                       | `-n`            | Decline all default configurations.            |
  | `--dry-run`                  |                 | Simulate the setup process without executing.  |

#### Add Arguments

Use the `add` command to target an existing Astro project:

| Name      | Type   | Default value | Description                    |
| :-------- | :----- | :------------ | :----------------------------- |
| directory | String | .             | Project directory to add Qwik. |

#### Add Options

| Name        | Shortcut | Description                                   |
| :---------- | :------- | :-------------------------------------------- |
| `--help`    | `-h`     | Display all available options.                |
| `--dry-run` |          | Simulate the add flow without executing it.   |
| `--yes`     | `-y`     | Accept defaults and skip prompts.             |
| `--no`      | `-n`     | Decline defaults and skip prompts when valid. |

#### Upgrade Arguments

Use the `upgrade` command to target an existing v1 project:

| Name      | Type   | Default value | Description                 |
| :-------- | :----- | :------------ | :-------------------------- |
| directory | String | .             | Project directory to upgrade. |

#### Upgrade Options

| Name        | Shortcut | Description                                       |
| :---------- | :------- | :------------------------------------------------ |
| `--help`    | `-h`     | Display all available options.                    |
| `--dry-run` |          | Show planned changes without modifying files.     |
| `--yes`     | `-y`     | Accept defaults and continue without prompting.   |
| `--no`      | `-n`     | Decline defaults and abort when prompts would be required. |

### 💡 Examples

The easiest way to explore [QwikDev/Astro](https://github.com/QwikDev/astro)
on your machine is by running the following command:

```bash
npm create @qwik.dev/astro@latest
```

1. Start Without Any Template

    You can create a project with no template to keep it minimal
    or customize it from scratch.
    This approach uses only the default starter kit provided by the integration:

    ```bash
    npm create @qwik.dev/astro@latest my-project
    ```

   To skip all prompts and initialize without a template automatically:

   ```bash
   npm create @qwik.dev/astro@latest my-project --yes
   ```

2. Add **Qwik/Astro** to an Existing Project

    If you already have an existing project
    and want to integrate QwikDev/Astro without creating a new project,
    you can use the `add` subcommand:

    ```bash
    npm create @qwik.dev/astro@latest add ./my-existing-project
    ```

    To target the current directory, omit the path:

    ```bash
    npm create @qwik.dev/astro@latest add
    ```

3. Use an Official Template

   You can initialize a project with a pre-built template
   (e.g., minimal, portfolio, starlight, blog, etc.):

   ```bash
   npm create @qwik.dev/astro@latest --template <name>
   ```

   [The full list of templates is quite long](https://github.com/withastro/astro/tree/main/examples),
   so make sure to check it out to find one that fits your project needs.

4. Clone a Specific GitHub Repository

    You can use any GitHub repository as a template:

    ```bash
    npm create @qwik.dev/astro@latest --template <user>/<repo>
    ```

    For a broader range of community-provided templates,
    visit the [Awesome Astro repository](https://github.com/one-aalam/awesome-astro?tab=readme-ov-file#%E2%84%B9%EF%B8%8F-repositoriesstarter-kitscomponents). 

5. Use Nested GitHub Examples

    Paths to examples nested inside a GitHub repository are also supported:

    ```bash
    npm create @qwik.dev/astro@latest --template <user>/<repo>/path/to/example
    ```

6. Advanced Use Cases

    You can combine multiple flags on the create flow to set up your project exactly as needed:

    ```bash
    npm create @qwik.dev/astro@latest my-project --template portfolio --yes --no-git --no-ci
    ```

### 📦 API

For developers looking to programmatically access the CLI functionality:

1. Basic Usage

    Run the CLI programmatically without arguments:

    ```typescript
    import createQwikAstro from '@qwik.dev/create-astro';

    createQwikAstro();
    ```

2. With Custom Arguments

    Specify arguments directly:

    ```typescript
    import { run } from '@qwik.dev/create-astro';

    // Create a new project
    run(["node", "cli", "./qwik-astro-app", "node"]);

    // Add to existing project
    run(["node", "cli", "add", "./my-project"]);

    // Upgrade from v1
    run(["node", "cli", "upgrade", "./my-project"]);
    ```

3. Sub-path Exports

    Fine-grained access to individual commands:

    ```typescript
    import { app } from '@qwik.dev/create-astro/app';
    import { add } from '@qwik.dev/create-astro/add';
    import { upgrade } from '@qwik.dev/create-astro/upgrade';
    ```

4. Definition Types

    Define the structure of the create, add, and upgrade commands:

    ```typescript
    export type Definition = {
      destination: string;
      adapter?: "deno" | "node" | "none";
      template?: string;
      add?: boolean;
      force?: boolean;
      copy?: boolean;
      biome?: boolean;
      install?: boolean;
      git?: boolean;
      ci?: boolean;
      yes?: boolean;
      no?: boolean;
      dryRun?: boolean;
    };

    export type AddDefinition = {
      directory: string;
      dryRun?: boolean;
      yes?: boolean;
      no?: boolean;
    };

    export type UpgradeDefinition = {
      directory: string;
      dryRun?: boolean;
      yes?: boolean;
      no?: boolean;
    };
    ```

5. Default Settings

    Here are the default configurations:

    ```typescript
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
      dryRun: undefined
    } as const;

    export const defaultAddDefinition = {
      directory: ".",
      dryRun: undefined,
      yes: undefined,
      no: undefined
    } as const;

    export const defaultUpgradeDefinition = {
      directory: ".",
      dryRun: undefined,
      yes: undefined,
      no: undefined
    } as const;
    ```

## 🌐 Community

- 🐦 Ping [@QwikDev](https://twitter.com/QwikDev) on Twitter
- 💬 Join our [Discord community](https://qwik.dev/chat) for discussions and support

## 🔗 Related Links

- 📖 [Qwik](https://qwik.dev/) – Build instantly-interactive web apps.
- 📖 [Astro](https://astro.build/) – The web framework for content-rich websites.
- 🌟 [Awesome Astro (Community Examples)](https://github.com/one-aalam/awesome-astro?tab=readme-ov-file#%E2%84%B9%EF%B8%8F-repositoriesstarter-kitscomponents)
- 📚 [Full List of Templates](https://github.com/withastro/astro/tree/main/examples)
