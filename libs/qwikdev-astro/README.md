# @qwikdev/astro 💜

Leverage the power of [Resumability](https://qwik.builder.io/docs/concepts/resumable/#resumable-vs-hydration) inside of Astro, using Qwik components.

## Installation

There are two methods to add the integration. Let's begin with the easiest one!

### The Astro CLI

Astro comes with a command-line tool for incorporating built-in integrations: `astro add`. This command will:

1. Optionally install all required dependencies and peer dependencies
2. Optionally modify your `astro.config.*` file to apply the integration

To install `@qwikdev/astro`, run the following from your project directory and follow the prompts:

```
# Using NPM
npx astro add @qwikdev/astro
# Using Yarn
yarn astro add @qwikdev/astro
# Using PNPM
pnpm astro add @qwikdev/astro
```

### Setting up the TypeScript Config

The integration needs the following in `tsconfig.json` for typescript to recognize Qwik's JSX types.

```ts
"compilerOptions": {
"jsx": "react-jsx",
"jsxImportSource": "@builder.io/qwik"
}
```

If you face any issues, please post them on Github and attempt the manual installation below.

### Manual Installation

First, install the `@qwikdev/astro` integration like so:

```
npm install @qwikdev/astro
```

Typically, package managers install peer dependencies. However, if you get a `Cannot find package '@builder.io/qwik'` warning when starting Astro, install Qwik.

```
npm install @builder.io/qwik
```

Now, add the integration to your `astro.config.*` file using the `integrations` property:

```diff lang="js" "qwikdev()"
  // astro.config.mjs
  import { defineConfig } from 'astro/config';
+ import qwikdev from '@qwikdev/astro';

  export default defineConfig({
    // ...
    integrations: [qwikdev()],
    //             ^^^^^
  });
```

## Getting started

Hooray! We now have our integration installed. Before deep diving in, there are some major things to cover.

## Qwik is fundamentally different

Astro is popular for its partial hydration approach and islands. Qwik on the other hand does not need hydration.

What does this mean?

### Qwik components **do not need hydration directives**,

When using Qwik inside a meta framework like Astro or Qwik City, they are loaded on the server and "resumed" on the client.

For example here's how we create a counter component in Qwik.

```tsx
import { component$, useSignal } from "@builder.io/qwik";

export const Counter = component$(() => {
  const counter = useSignal(0);

  return <button onClick$={() => counter.value++}>{counter.value}</button>;
});
```

It can be consumed in our `index.astro` page like so:

```tsx
---
import { Counter } from "../components/counter";
---

<html lang="en">
	<head>
		<meta charset="utf-8" />
		<link rel="icon" type="image/svg+xml" href="/favicon.svg" />
		<meta name="viewport" content="width=device-width" />
		<meta name="generator" content={Astro.generator} />
		<title>Astro</title>
	</head>
	<body>
		<h1>Astro.js - Qwik</h1>
        /* no hydration directive! */
		<Counter />
	</body>
</html>
```

### There are no islands

Instead of islands, when a Qwik component is used in Astro, it's inside of a **[Qwik container](https://qwik.builder.io/docs/advanced/containers/#containers)**.

Unlike the island architecture, Qwik containers can communicate and share data. Allowing for more complex interactions and state management using Qwik. [There are some tradeoffs to be considered](https://qwik.builder.io/docs/advanced/containers/#containers-vs-components).

## Credits

Special thanks to Matthew and Nate from the Astro core team! This integration would not be possible without their help.
