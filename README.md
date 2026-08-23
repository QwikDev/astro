<p align="center">
  <img src="apps/website/public/qwik-v2-logo.svg" width="120" alt="Qwik logo" />
</p>

<h1 align="center">Qwik + Astro</h1>

<p align="center">
  Render <a href="https://qwik.dev/">Qwik</a> components in <a href="https://astro.build/">Astro</a>.
  <br />
  Zero hydration. Instant interactivity. HTML until users care.
</p>

<p align="center">
  <a href="https://astro.qwik.dev/docs">Documentation</a> · <a href="https://github.com/QwikDev/astro/issues">Report an Issue</a> · <a href="https://discord.com/channels/842438759945601056/1150941080355881080">Discord</a>
</p>

## Quick Start

Astro 7 requires Node.js 22.12.0 or newer when using the Node.js runtime.

**npm**
```bash
npm create @qwik.dev/astro@latest
```

**pnpm**
```bash
pnpm create @qwik.dev/astro@latest
```

**yarn**
```bash
yarn create @qwik.dev/astro
```

**bun**
```bash
bun create @qwik.dev/astro
```

### Add to an existing project

**npm**
```bash
npm create @qwik.dev/astro@latest add
```

**pnpm**
```bash
pnpm create @qwik.dev/astro@latest add
```

**yarn**
```bash
yarn create @qwik.dev/astro add
```

**bun**
```bash
bun create @qwik.dev/astro add
```

The `add` command targets the current directory by default. Pass a path such as
`npm create @qwik.dev/astro@latest add ./my-project` to add Qwik to a different Astro app. Supports official Astro templates and many community starters/themes

See the [CLI documentation](libs/create-qwikdev-astro/README.md) for all available commands and options.

For full installation instructions, guides, and API reference, visit **[qwik.dev/astro](https://qwik.dev/astro)**.

## Upgrading from the legacy integration

The current `@qwik.dev/astro` v1 line targets **Qwik v2 beta**. Version 1.1 adds **Astro 7** and **Vite 8** support; the integration's v2 release is reserved for stable Qwik v2. Astro 6 projects should remain on `@qwik.dev/astro` v1.0.x. If you need Astro <5 or Qwik v1, use the [`@qwikdev/astro`](https://www.npmjs.com/package/@qwikdev/astro) package (without the dot).

Run the upgrade script from your project directory:

```sh
npm create @qwik.dev/astro@latest upgrade
```

Pass a path such as `npm create @qwik.dev/astro@latest upgrade ./my-project`
to upgrade a different project directory.

The upgrade script handles package swaps and import rewrites automatically. However, it does not cover Astro-specific breaking changes:

- **`<ViewTransitions />` renamed to `<ClientRouter />`** — Astro renamed this component. Update your layouts accordingly.
- **`clientRouter` is now required in the integration config** — `@qwik.dev/astro` requires a `clientRouter: true | false` property in your `astro.config`:

  ```js
  import qwik from "@qwik.dev/astro";

  export default defineConfig({
    integrations: [qwik({ clientRouter: true })],
  });
  ```

If the script doesn't work for your setup, follow the [manual upgrade guide](https://astro.qwik.dev/docs/upgrade/).

## Contributing

See our [Contributing Guide](https://astro.qwik.dev/docs/contributing/) to get started.

## Help

Reach out in the [Qwik Discord](https://discord.gg/p7E6mgXGgF), there's a dedicated [#qwik-astro](https://discord.com/channels/842438759945601056/1150941080355881080) channel. You can also [open an issue](https://github.com/QwikDev/astro/issues).

## Maintainers

- [Jack Shelton](https://twitter.com/TheJackShelton)
- [Sigui Kessé Emmanuel](https://twitter.com/siguici)
