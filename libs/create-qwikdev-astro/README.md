# Create @qwikdev/astro 🎉

## **The Ultimate Starter for QwikDev/Astro Projects**

Seamlessly scaffold content-driven web projects with the power of [QwikDev/Astro](https://github.com/QwikDev/astro).
Whether you're building blazing-fast blogs, portfolios, or scalable applications,
this CLI has you covered.

---

## 🚀 **Installation & Usage**

### 🧑‍💻 CLI

Run the following command using your preferred package manager:

- **With `NPM`**:

  ```bash
  npm create @qwikdev/astro@latest [destination] [adapter] [...options]
  ```

- **With `Yarn`**:

  ```bash
  yarn create @qwikdev/astro [destination] [adapter] [...options]
  ```

- **With `PNPM`**:

  ```bash
  pnpm create @qwikdev/astro [destination] [adapter] [...options]
  ```

- **With `Bun`**:

  ```bash
  bun create @qwikdev/astro [destination] [adapter] [...options]
  ```

### 🛠️ Arguments & Options

#### Arguments

  Customize the command with the following arguments:

  | Name        | Type                       | Default value    | Description                       |
  | :-----------| :--------------------------| :----------------| :---------------------------------|
  | destination | String                     | ./qwik-astro-app | Directory of the project.         |
  | adapter     | "deno" or "node" or "none" | none             | Server adapter.                   |

#### Options

  Enhance your project setup with these additional flags:

  | Name                         | Shortcut        | Description                                    |
  | :--------------------------- | :---------------| :----------------------------------------------|
  | `--help`                     | `-h`            | Display all available options.                 |
  | `--template`                 | `-t`            | Use an Astro template.                         |
  | `--add` / `--no-add`         | `-a` / `--no-a` | Add QwikDev/astro to an existing project.      |
  | `--force` / `--no-force`     | `-f` / `--no-f` | Overwrite target directory, if needed.         |
  | `--copy` / `--no-copy`       | `-c` / `--no-c` | Copy files without overwriting.                |
  | `--biome` / `--no-biome`     |                 | Use Biome instead of ESLint/Prettier.          |
  | `--install` / `--no-install` | `-i` / `--no-i` | Automatically install dependencies.            |
  | `--git` / `--no-git`         |                 | Initialize a Git repository.                   |
  | `--ci` / `--no-ci`           |                 | Add CI workflow.                               |
  | `--yes`                      | `-y`            | Accept all default configurations.             |
  | `--no`                       | `-n`            | Decline all default configurations.            |
  | `--dry-run`                  |                 | Simulate the setup process without executing.  |

### 📦 API

For developers looking to programmatically access the CLI functionality:

1. Basic Usage

    Run the CLI programmatically without arguments:

    ```typescript
    import createQwikAstro from '@qwikdev/create-astro';

    createQwikAstro();
    ```

2. With Custom Arguments

    Specify arguments directly:

    ```typescript
    import { run } from '@qwikdev/create-astro';

    run(["./qwik-astro-app", "node"]);
    ```

3. Definition Types

    Define the structure of the CLI options and arguments:

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
    ```

4. Default Settings

    Here are the default configurations:

    ```typescript
    export const defaultDefinition = {
      destination: "./qwik-astro-app",
      adapter: "none",
      template: "",
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
    ```

## 🌐 Community

- 🐦 Ping [@QwikDev](https://twitter.com/QwikDev) on Twitter
- 💬 Join our [Discord community](https://qwik.dev/chat) for discussions and support

## 🔗 Related Links

- 📖 [Qwik](https://qwik.dev/) – Build instantly-interactive web apps.
- 📖 [Astro](https://astro.build/) – The web framework for content-rich websites.
- 🌟 [Awesome Astro (Community Examples)](https://github.com/one-aalam/awesome-astro?tab=readme-ov-file#%E2%84%B9%EF%B8%8F-repositoriesstarter-kitscomponents)
- 📚 [Full List of Templates](https://github.com/withastro/astro/tree/main/examples)
