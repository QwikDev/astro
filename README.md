# @qwikdev/astro 💜

Leverage the power of [Resumability](https://qwik.builder.io/docs/concepts/resumable/) and fine-grained lazy loading inside of Astro, using Qwik components.

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

## Key differences

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

### Starts fast, stays fast

One of Astro's key features is **Zero JS, by default**. Unfortunately, when we want to add a JavaScript framework this is usually not the case.

If we want to introduce interactivity with a framework (React, Vue, Svelte, etc.) the framework runtime is then introduced into the mix, and the amount of components added to the page is O(n) with the amount of JavaScript.

#### Astro + Qwik

Qwik builds on top of the Astro's **Zero JS, by defaut** principle. Even with interactivity, the framework is not executed until it needs to be. The components are also not executed unless they are resumed. It is O(1) constant.

Instead, on page load a 1kb minified tiny piece of JavaScript called the [Qwikloader](https://qwik.builder.io/docs/advanced/qwikloader/#qwikloader) downloads the rest of the application on an as needed basis.

### Containers vs. Islands

While Astro generally adopts an islands architecture with other frameworks, Qwik uses a different strategy known as [Qwik containers](https://qwik.builder.io/docs/advanced/containers/). Despite the differences in approach, both share similar limitations.

![An example of a Qwik container](https://imgur.com/a/iDgQrgG)

In the DOM, you'll notice there aren't any `<astro-island>` custom elements, this is because to Astro, Qwik looks like static data.

> This is because in Qwik, the handlers themselves are the roots / entrypoints of the application.

#### Communicating across containers

Containers in Qwik, and Islands in Astro both have similar limitations. For example, trying to pass state into another island or container.

Sharing state is a crucial aspect of modern web development. How can we achieve this when we need to share state across different containers or islands?

Other frameworks with Astro address this by using [nano stores](https://github.com/nanostores/nanostores).

Instead, we recommend using **custom events**. Using custom events has several advantages:

- Micro Frontend (MFE) Support
- Different versions can exist on the page
- Survives serialization (unlike nano stores)
- Performance (avoid unnecessary state synchronization)
- Event Driven
- Decoupled

## Credits

Special thanks to Matthew and Nate from the Astro core team! This integration would not be possible without their help.
