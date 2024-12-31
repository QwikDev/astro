# Create @qwikdev/astro 🎉

## Scaffolding for [QwikDev/astro](https://github.com/QwikDev/astro) projects

### 🛠️ CLI

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

  The `create @qwikdev/astro` command runs interactively without any arguments or options.

  However, it is possible to use the interactive mode as described below:

  **Types of arguments:**

  | Name        | Type                       | Default value    | Description                       |
  | :-----------| :--------------------------| :----------------| :---------------------------------|
  | destination | String                     | ./qwik-astro-app | Directory of the project.         |
  | adapter     | "deno" or "node" or "none" | none             | Server adapter.                   |

  **Types of options:**

  | Name                                   | Description                              |
  | :--------------------------------------| :----------------------------------------|
  | `--help` (`-h`)                        | Display available flags.                 |
  | `--template` (`-t`)                    | Start from an Astro template.            |
  | `--biome` / `--no-biome`                   | Prefer Biome to ESLint/Prettier.         |
  | `--install` / `--no-install` (`-i` / `--no-i`) | Install dependencies.                    |
  | `--git` / `--no-git`                       | Initialize Git repository.               |
  | `--ci` / `--no-ci`                         | Add CI workflow.                         |
  | `--yes` (`-y`)                             | Skip all prompts by accepting defaults.  |
  | `--no` (`-n`)                              | Skip all prompts by declining defaults.  |
  | `--add` / `--no-add` (`-a` / `--no-a`) | Add QwikDev/astro to existing project.   |
  | `--force` / `--no-force` (`-f` / `--no-f`)     | Overwrite target directory if it exists. |
  | `--safe` / `--no-safe` (`-s` / `--no-s`)     | Copy files without overwriting. |
  | `--dry-run`                              | Walk through steps without executing.    |

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
    template?: string;
    biome?: boolean;
    install?: boolean;
    git?: boolean;
    ci?: boolean;
    yes?: boolean;
    no?: boolean;
    add?: boolean;
    force?: boolean;
    dryRun?: boolean;
  };
  ```

**Default definition:**

```typescript
export const defaultDefinition = {
  destination: "./qwik-astro-app",
  adapter: "none",
  template: "",
  install: undefined,
  biome: undefined,
  git: undefined,
  ci: undefined,
  yes: undefined,
  no: undefined,
  add: undefined,
  force: undefined,
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
