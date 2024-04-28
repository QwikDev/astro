# Create @qwikdev/astro 🎉

## Scaffolding for [QwikDev/astro](https://github.com/QwikDev/astro) projects

### 🛠️ CLI

  - **With `NPM`**:

    ```bash
    npm create @qwikdev/astro@latest [project] [adapter] [...options]
    ```

  - **With `Yarn`**:

    ```bash
    yarn create @qwikdev/astro [project] [adapter] [...options]
    ```

  - **With `PNPM`**:

    ```bash
    pnpm create @qwikdev/astro [project] [adapter] [...options]
    ```

  - **With `Bun`**:

    ```bash
    bun create @qwikdev/astro [project] [adapter] [...options]
    ```

  The `create @qwikdev/astro` command runs interactively without any arguments or options.

  However, it is possible to use the interactive mode as described below:

  **Types of arguments:**

  | Name    | Type             | Default value    | Description                       |
  | :-------| :----------------| :----------------| :---------------------------------|
  | project | String           | ./qwik-astro-app | Directory of the project.         |
  | adapter | "deno" or "node" | node             | Server adapter.                   |

  **Types of options:**

  | Name                                   | Description                              |
  | :--------------------------------------| :----------------------------------------|
  | `--help` (`-h`)                            | Display available flags.                 |
  | `--it`                                   | Execute actions interactively.           |
  | `--dry-run`                              | Walk through steps without executing.    |
  | `--force` / `--no-force` (`-f` / `--no-f`)     | Overwrite target directory if it exists. |
  | `--install` / `--no-install` (`-i` / `--no-i`) | Install dependencies.                    |
  | `--biome` / `--no-biome`                   | Prefer Biome to ESLint/Prettier.         |
  | `--git` / `--no-git`                       | Initialize Git repository.               |
  | `--ci` / `--no-ci`                         | Add CI workflow.                         |
  | `--yes` (`-y`)                             | Skip all prompts by accepting defaults.  |
  | `--no` (`-n`)                              | Skip all prompts by declining defaults.  |

### 📦 API

  - Use the arguments provided in the command line:

    ```typescript
    import createQwikAstro from '@qwikdev/create-astro';

    createQwikAstro();
    ```

  - Specify the command line arguments to use:

    ```typescript
    import { runCreate } from '@qwikdev/create-astro';

    runCreate("./qwik-astro-app", "node", "--it");
    ```

  - Pass the arguments to create a new project:

    ```typescript
    import { createProject } from '@qwikdev/create-astro';

    const config = {
      project: "./qwik-astro-app",
      starter: "node",
      it: false,
    };

    createProject(config);
    ```

  **Project configuration type:**

  ```typescript
  export type ProjectConfig = {
    project: string;
    adapter?: "deno" | "node";
    force?: boolean;
    install?: boolean;
    biome?: boolean;
    git?: boolean;
    ci?: boolean;
    yes: boolean;
    no: boolean;
    it: boolean;
    dryRun: boolean;
  };
  ```

## 🌍 Community

- Follow us on [@QwikDev](https://twitter.com/QwikDev)
- Ping us at [@QwikDev](https://twitter.com/QwikDev)
- Join our [Discord](https://qwik.dev/chat) community

## 🔗 Related

- [Qwik](https://qwik.dev/)
- [Astro](https://astro.build/)
