# @qwikdev/astro 💜

Leverage the power of [Resumability](https://qwik.builder.io/docs/concepts/resumable/) inside of Astro, using Qwik components.

## Installation

There are two methods to add the integration. Let's begin with the easiest one!

### The Astro CLI

Astro comes with a command-line tool for incorporating built-in integrations: `astro add`. This command will:

1. Optionally install all required dependencies and peer dependencies
2. Optionally modify your `astro.config.*` file to apply the integration

To install `@qwikdev/astro`, run the following from your project directory and follow the prompts:

```sh
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

#### When Qwik isn't the primary jsxImportSource

If you don't intend to use Qwik as your primary `jsxImportSource`, add:

```
/** @jsxImportSource @builder.io/qwik */
```

at the top of each Qwik component file.

This is when you may not have that many Qwik components compared to other JSX frameworks on the page.

If you face any issues, please [post them on Github](https://github.com/QwikDev/astro/issues) and attempt the manual installation below.

### Manual Installation

First, install the `@qwikdev/astro` integration like so:

```sh
npm install @qwikdev/astro
```

Typically, package managers install peer dependencies. However, if you get a `Cannot find package '@builder.io/qwik'` warning when starting Astro, install Qwik.

```sh
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

Hooray! We now have our integration installed. Before deep diving in, there are quite a few differences than other UI frameworks.

## Qwik does not hydrate, it is **fundamentally different**

Astro is popular for its partial hydration approach, whereas Qwik [does not require hydration](https://www.builder.io/blog/hydration-tree-resumability-map#resumability-is-fundamentally-a-different-algorithm).

What does this mean?

### Qwik components **do not need hydration directives**

In other UI frameworks, a hydration directive would be needed for interactivity, such as `client:only` or `client:load`. These are not needed with Qwik, because there is no hydration!

When using Qwik inside a meta framework like Astro or Qwik City, components are loaded on the server, prefetched in a separate thread, and "resumed" on the client.

For example here's how we create a counter component in Qwik (e.g. at `src/components/counter.tsx`).

```tsx
import { component$, useSignal } from "@builder.io/qwik";

export const Counter = component$(() => {
  const counter = useSignal(0);

  return <button onClick$={() => counter.value++}>{counter.value}</button>;
});
```

It can be consumed in our `index.astro` page like so:

```astro
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

Let's take a look at this in the wild.

![A gif showing a button clicked and the onClick$ resumed](https://i.imgur.com/unp1MRN.gif)

Here we are refreshing the page, and you'll notice nothing was executed until the button was clicked. Without resumability, our `<Counter />` would have been executed on page load.

The 402 byte q-chunk is our Counter's `onClick$` handler.

#### What's in that 17.61kb chunk?

The framework! We do not execute it until it is needed. In this case it is gzipped using SSG.

## Starts fast, stays fast

One of Astro's key features is **Zero JS, by default**. Unfortunately, after adding a JavaScript framework, and any subsequent components this is usually not the case.

If we want to introduce interactivity with a framework such as React, Vue, Svelte, etc., the framework runtime is then introduced. The number of components added to the page also increases linearly O(n) with the amount of JavaScript.

### Astro + Qwik

Qwik builds on top of Astro's **Zero JS, by defaut** principle and then some. Thanks to resumability, the components are not executed unless resumed. Even with interactivity, the framework is also not executed until it needs to be. It is O(1) constant, and zero effort on the developer.

![Resumability vs. Hydration chart](https://i.gyazo.com/3996e249ae856e12a1918ea389b399e6.webp)

Instead, upon page load, a tiny 1kb minified piece of JavaScript, known as the [Qwikloader](https://qwik.builder.io/docs/advanced/qwikloader/#qwikloader), downloads the rest of the application as needed.

### Fine-grained lazy loading

Hydration forces your hand [to eagerly execute code](https://www.builder.io/blog/hydration-sabotages-lazy-loading). It's not a problem with components that are outside of the tree, such as modals, but it must exhaustively check each component in the render tree just in case.

Qwik works exceptionally well in Astro due to Resumability and its ability to lazy load code in a fine-grained manner. Especially for marketing sites, blogs, and content oriented sites with many components.

## Containers vs. Islands

While Astro generally adopts an islands architecture with other frameworks, Qwik uses a different strategy known as [Qwik containers](https://qwik.builder.io/docs/advanced/containers/). Despite the differences in approach, both share similar limitations.

![An example of a Qwik container](https://i.imgur.com/hJJtRHj.jpeg)

In the DOM, you'll notice there aren't any `<astro-island>` custom elements, this is because to Astro, Qwik looks like static data.

> This is because in Qwik, the handlers themselves are the roots / entrypoints of the application.

### Communicating across containers

One common limitation is trying to pass state into another island or container.

Sharing state is crucial in modern web development. The question is, how can we achieve this when state needs to be shared across different containers or islands?

Other frameworks with Astro address this by using [nano stores](https://github.com/nanostores/nanostores).

Instead, we recommend the use of **custom events**, which offer several advantages:

- Micro Frontend (MFE) Support
- Different versions can exist on the page
- Survives serialization (unlike nano stores)
- Performance (avoid unnecessary state synchronization)
- Event Driven
- Decoupled

## Using multiple JSX frameworks

Unfortunately, TypeScript can only have one `jsxImportSource` default. If you're using React, Solid, or Preact's Astro integration in your Astro app alongside, please override each component's import source.

> If you're using [@astrojs/react](https://www.npmjs.com/package/@astrojs/react), you can use [qwik-react](https://qwik.builder.io/docs/integrations/react/#qwik-react-%EF%B8%8F) instead. The proper configuration will be supported out of the box.

```tsx
/** @jsxImportSource react */
import { useState } from "react";

export const ReactCounter = () => {
  const [count, setCount] = useState(0);
  return <button onClick={() => setCount(count + 1)}>{count}</button>;
};
```

Solid JS for example, is:

```
/** @jsxImportSource solid-js */
```

Preact for example, is:

```
/** @jsxImportSource preact */
```

## Named Slots

For named slots within Astro, instead of adding `q:slot` on the markup, add `slot` instead.

**my-slot-comp.tsx**

```tsx
import { Slot, component$, useSignal } from "@builder.io/qwik";

export const MySlotComp = component$<{ initial: number }>((props) => {
  return (
    <>
      <Slot name="test" />
    </>
  );
});
```

**index.astro**

```astro
  <MySlotComp>
    <div slot="test">Content inside the slot named test!</div>
  </MySlotComp>
```

Default slots work as expected in their Qwik City counterpart.

## Community Guides

- [Paul Scanlon](https://www.paulie.dev/) shows a hands-on look at [using Qwik in Astro over React and Vanilla JS](https://thenewstack.io/how-quiks-astro-integration-beats-both-react-and-vanilla-js/).

- [Rishi Raj Jain](https://twitter.com/rishi_raj_jain_) has written an awesome guide on setting up Qwik with Astro's [Vercel SSR Adapter](https://dev.to/reeshee/qwik-look-at-resumability-with-astro-on-vercel-44fj).

## Contributing

We'd love for you to contribute! Start by reading our [Contributing Guide](https://github.com/QwikDev/astro/blob/main/contributing.md). It's got all the info you need to get involved, including an in-depth section on how the integration works under the hood.

There's also a `qwik-astro` channel in the builder.io discord to discuss API changes, possible ideas to the integration, and other cool stuff. 😊

## Credits

Special thanks to Matthew and Nate from the Astro core team! This integration would not be possible without their help.

Nate's handles:

- [Twitter](https://twitter.com/n_moore)
- [GitHub](https://github.com/natemoo-re)
