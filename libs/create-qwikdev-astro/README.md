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

  | Name        | Type                       | Default value | Description                       |
  | :-----------| :--------------------------| :-------------| :---------------------------------|
  | destination | String                     | .             | Directory of the project.         |
  | adapter     | "deno" or "node" or "none" | none          | Server adapter.                   |

  **Types of options:**

  | Name                                   | Description                              |
  | :--------------------------------------| :----------------------------------------|
  | `--help` (`-h`)                            | Display available flags.                 |
  | `--dry-run`                              | Walk through steps without executing.    |
  | `--force` / `--no-force` (`-f` / `--no-f`)     | Overwrite target directory if it exists. |
  | `--add` / `--no-add` (`-a` / `--no-a`) | Add QwikDev/astro to existing project.   |
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
    import { run } from '@qwikdev/create-astro';

    run(["./qwik-astro-app", "node"]);
    ```

  **Definition type:**

  ```typescript
  export type Definition = {
    destination: string;
    adapter?: "deno" | "node" | "none";
    force?: boolean;
    add?: boolean;
    install?: boolean;
    biome?: boolean;
    git?: boolean;
    ci?: boolean;
    yes?: boolean;
    no?: boolean;
    dryRun?: boolean;
  };
  ```

**Default definition:**

```typescript
export const defaultDefinition = {
  destination: ".",
  adapter: "none",
  force: undefined,
  add: undefined,
  install: undefined,
  biome: undefined,
  git: undefined,
  ci: undefined,
  yes: undefined,
  no: undefined,
  dryRun: undefined
} as const;
```

## 🌍 Community

- Follow us on [@QwikDev](https://twitter.com/QwikDev)
- Ping us at [@QwikDev](https://twitter.com/QwikDev)
- Join our [Discord](https://qwik.dev/chat) community

## 🔗 Related

- [Qwik](https://qwik.dev/)
- [Astro](https://astro.build/)
