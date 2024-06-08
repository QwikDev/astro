# @qwikdev/astro 💜

The Qwik Astro integration automatically optimizes your project thanks to [JavaScript Streaming](https://github.com/QwikDev/astro/blob/main/README.md#what-is-javascript-streaming).

This project is a result of a year-long effort by some [dedicated Astronauts](https://github.com/QwikDev/astro/issues/82) so that you can focus on the thing that matters: building your amazing website or app.

## Installation

### The `@qwikdev/astro` CLI 🦾

To start a new Qwik Astro project, you can run the following command:

  - **With `NPM`**:

    ```bash
    npm create @qwikdev/astro
    ```

  - **With `Yarn`**:

    ```bash
    yarn create @qwikdev/astro
    ```

  - **With `PNPM`**:

    ```bash
    pnpm create @qwikdev/astro
    ```

  - **With `Bun`**:

    ```bash
    bun create @qwikdev/astro
    ```

  For more advanced CLI configuration options, see the [@qwikdev/astro CLI documentation](https://github.com/QwikDev/astro/blob/main/libs/create-qwikdev-astro/README.md).

  > The CLI is still in beta, if you encounter any problems, please [open an issue](https://github.com/QwikDev/astro/issues) and try one of the other methods below.

### Have an existing project?

To install `@qwikdev/astro` in an existing project, run the following from your project directory and follow the prompts:

```sh
# Using NPM
npx astro add @qwikdev/astro

# Using Yarn
yarn astro add @qwikdev/astro

# Using PNPM
pnpm astro add @qwikdev/astro
```

### Setting up the TypeScript Config (Existing or Manual)

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

If you face any issues, [post them on Github](https://github.com/QwikDev/astro/issues) and attempt the manual installation below.

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

Before deep diving in, there are quite a few differences than other UI frameworks.

## Qwik does not hydrate, it is **fundamentally different**

Astro is popular for its partial hydration approach, whereas Qwik [does not require hydration](https://www.builder.io/blog/hydration-tree-resumability-map#resumability-is-fundamentally-a-different-algorithm).

### Qwik components **do not need hydration directives**

In other UI frameworks, a hydration directive would be needed for interactivity, such as `client:only` or `client:load`. These are not needed with Qwik, because there is no hydration!

When using Qwik inside a meta framework like Astro or Qwik City, components are loaded on the server, prefetched in a separate thread, and "resumed" on the client.

For example here's how to create a counter component in Qwik (e.g. at `src/components/counter.tsx`).

```tsx
import { component$, useSignal } from "@builder.io/qwik";

export const Counter = component$(() => {
  const counter = useSignal(0);

  return <button onClick$={() => counter.value++}>{counter.value}</button>;
});
```

It can be consumed in an `index.astro` page like so:

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

![A gif showing a button clicked and the onClick$ resumed](https://i.imgur.com/unp1MRN.gif)

The above example refreshes the page, and notice nothing was executed until the button was clicked. Without resumability, the `<Counter />` would have been executed on page load.

The 402 byte q-chunk is our Counter's `onClick$` handler.

#### What's in that 17.61kb chunk?

The framework! It is not executed until needed. In this case it is gzipped using SSG.

## Starts fast, stays fast

One of Astro's key features is **Zero JS, by default**. Unfortunately, after adding a JavaScript framework, and any subsequent components this is usually not the case.

When introducing interactivity with a framework such as React, Vue, Svelte, etc., the framework runtime is then introduced. The number of components added to the page also increases linearly O(n) with the amount of JavaScript.

### Astro + Qwik

Qwik builds on top of Astro's **Zero JS, by defaut** principle and then some. Thanks to resumability, the components are not executed unless resumed. Even with interactivity, the framework is also not executed until it needs to be. It is O(1) constant, and zero effort on the developer.

![Resumability vs. Hydration chart](https://i.gyazo.com/3996e249ae856e12a1918ea389b399e6.webp)

Instead, upon page load, a tiny 1kb minified piece of JavaScript, known as the [Qwikloader](https://qwik.builder.io/docs/advanced/qwikloader/), downloads the rest of the application as needed.

### Fine-grained lazy loading

Hydration forces your hand [to eagerly execute code](https://www.builder.io/blog/hydration-sabotages-lazy-loading). It's not a problem with components that are outside of the tree, such as modals, but it must exhaustively check each component in the render tree just in case.

Qwik works well in Astro due to Resumability and its ability to lazy load code in a fine-grained manner. The moment JavaScript interactivity is involved, use Qwik. Some examples include marketing sites, blogs, content oriented sites, e-commerce applications, and even full-blown web-apps at scale.

### Instant interactivity

As of `@qwikdev/astro` v0.4, there is support for [Speculative Module Fetching](https://qwik.builder.io/docs/advanced/speculative-module-fetching/) in Astro.

This enables instant interactivity for your Qwik components. Speculative module fetching will prefetch the application bundles in the background of a service worker, so that when needed, the code is already present in the browser cache.

> You should be able to use [Qwik insights](https://qwik.builder.io/docs/labs/insights/) out of the box!

## Containers vs. Islands

While Astro generally adopts an islands architecture with other frameworks, Qwik uses a different strategy known as [Qwik containers](https://qwik.builder.io/docs/advanced/containers/). Despite the differences in approach, both share similar limitations.

![An example of a Qwik container](https://i.imgur.com/hJJtRHj.jpeg)

In the DOM, notice there aren't any `<astro-island>` custom elements, this is because to Astro, Qwik looks like static data.

> In Qwik, the handlers themselves are the roots / entrypoints of the application.

### Communicating across containers

One common limitation is trying to pass state into another island or container.

Sharing state is crucial in modern web development. The question is, how can we achieve this when state needs to be shared across different containers or islands?

#### Why not use global signals or nanostores?

Other frameworks with Astro address this by using [nano stores](https://github.com/nanostores/nanostores), or [global signals](https://www.solidjs.com/tutorial/stores_nocontext).

While you may see all of your tests passing, and the application working as expected, we do not recommend using nanostores or global signals. They can lead to some unexpected behavior in an SSR context.

For example, in Solid's tutorial the following is mentioned:

> While it is possible to use global state and computations, Context is sometimes a better solution. Additionally, it is important to note that global state should not be used in SSR (server side rendering) solutions, such as Solid Start. On the server, global state is shared across requests, and the lack of data isolation can (and will) lead to bugs, memory leaks and has security implications. It is recommended that application state should always be provided via context instead of relying on global.

#### Custom Events

In Qwik, it was a design decision to not include global signal state.

Instead, use **custom events**, which offer several advantages:

- Performance (avoid unnecessary state synchronization)
- Does not wake up the framework on page load
- Micro Frontend (MFE) Support
- Different versions can exist on the page
- Event Driven
- Decoupled

[This example](https://github.com/thejackshelton/astro-qwik-global-state-example/blob/main/src/components/counter.tsx) shows how custom events can be used throughout your application. Pay attention to `counter.tsx`, `random-island.tsx`, and the `index.astro` page.

## Using multiple JSX frameworks

To use multiple JSX frameworks like Qwik, React, Preact, or Solid in Astro, you need to set up rules for which files each framework should handle.

For example, you can place all Qwik components in a folder named `qwik`. Then, configure Astro to process any file within this folder using the Qwik integration.

```tsx
import { defineConfig } from "astro/config";
import qwik from "@qwikdev/astro";
import react from "@astrojs/react";

export default defineConfig({
  integrations: [
    qwik({ include: "**/qwik/*" }),
    react({ include: "**/react/*" }),
    solid({ include: "**/solid/*" }),
  ],
});
```

Above the code snippet uses the Qwik, React, and Solid integrations in the same Astro project.

The first integration in the snippet above, looks for any file in the `qwik` folder and uses Qwik for any file in this folder.

For simplicity, consider grouping common framework components in the same folder (like `/components/react/` and `/components/qwik/`). However, this is optional.

### Qwik React

If you're using React, use the [Qwik-React integration](https://qwik.dev/docs/integrations/react/). It's a drop-in replacement for `@astrojs/react`, and allows a seamless transition to Qwik.

```tsx
import { defineConfig } from "astro/config";

import qwikdev from "@qwikdev/astro";
import { qwikReact } from "@builder.io/qwik-react/vite";

// https://astro.build/config
export default defineConfig({
  integrations: [qwikdev()],
  vite: {
    plugins: [qwikReact()],
  },
});
```

The Qwik-React integration allows you to use React components directly in Qwik.

> You do not need to specify an include property with Qwik-React.

[Here's an example](https://github.com/thejackshelton/qwik-react-astro-template) of a React component with the `qwik-react` integration.

```tsx
/** @jsxImportSource react */
import { qwikify$ } from "@builder.io/qwik-react";
import { useState } from "react";

const ReactCounter = () => {
  const [count, setCount] = useState(0);

  return <button onClick={() => setCount(count + 1)}>React {count}</button>;
};

// "Qwikified" React component
export const QReactCounter = qwikify$(ReactCounter);
```

After creating our counter, it can be consumed in the [index.astro](https://github.com/thejackshelton/qwik-react-astro-template/blob/main/src/pages/index.astro) file.

```tsx
<QReactCounter qwik:visible />
```

Notice that in `.astro` files there is a `qwik:` hydration directive prefix, this is to prevent a conflict with Astro's hydration directives that are provided out of the box.

You can also use the `client:*` prefix, but only in tsx files. You can find a list of directives in the Qwik-React [Adding Interactivity](https://qwik.builder.io/docs/integrations/react/#adding-interactivity) section of the Qwik docs.

> Qwik React components still have hydration. It is recommended to use Qwik-React as a migration strategy to resumable components.

### jsxImportSource

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

## Community Guides

- [Embed Stackblitz in a performant way](https://thenewstack.io/how-to-build-embed-components-with-astro-qwik-and-stackblitz/)

- [Build a Site Search with Astro, Qwik and Fuse.js](https://thenewstack.io/how-to-build-site-search-with-astro-qwik-and-fuse-js/)

- [Qwik as a React alternative](https://thenewstack.io/take-a-qwik-break-from-react-with-astro/) in Astro.

- [Deploy Qwik Astro with the Vercel SSR Adapter](https://dev.to/reeshee/qwik-look-at-resumability-with-astro-on-vercel-44fj).

- [Netlify's Guide to starting a Qwik Astro project](https://developers.netlify.com/guides/adding-resumability-to-astro-with-qwik/)

- [Using Qwik in Astro over React and Vanilla JS](https://thenewstack.io/how-quiks-astro-integration-beats-both-react-and-vanilla-js/).

- [Initial @qwikdev/astro Alpha Post](https://www.builder.io/blog/astro-qwik)

## Videos

- Steve's [Qwik Astro announcement video](https://www.youtube.com/watch?v=LIKxkSzHqeo)

- [Awesome's Qwik + Astro video](https://www.youtube.com/watch?v=wKvkYUNBa5k) goes into how Astro just got even faster.

- Watch Jason & Steve [discuss the Qwik Astro integration](https://www.youtube.com/watch?v=W-j2HH1GdjU&t=0s) on the [LWJ show](https://www.youtube.com/@learnwithjason).

- [JLarky's insights on Qwik and potentially RSC in Astro](https://www.youtube.com/shorts/aaJuBrgQQDk)

## Talks

- [Astro and Qwik - a match made in performance heaven! - DevWorld 2024](https://www.youtube.com/watch?v=OSIjoqVK51o)
- [Astro: A New Era of Effective Lazy Loading (fr)](https://www.youtube.com/watch?v=OgRfNfCMvvQ)

## Contributing

Start by reading our [Contributing Guide](https://github.com/QwikDev/astro/blob/main/contributing.md). It includes how to get involved, and an in-depth section on how the integration works under the hood.

## Help

If you're stuck, reach out in the Astro discord or the [Qwik discord](https://discord.gg/p7E6mgXGgF), which has a dedicated [qwik-astro](https://discord.com/channels/842438759945601056/1150941080355881080) channel. Problems directly related to the integration can be created [as an issue](https://github.com/QwikDev/astro/issues).

## Credits

### Maintainers

- [Jack Shelton](https://twitter.com/TheJackShelton)
- [Sigui Kessé Emmanuel](https://twitter.com/siguici)

### Astro Core Team

Special thanks to Matthew and Nate from the Astro core team! This integration would not be possible without their help.

Nate's handles:

- [Twitter](https://twitter.com/n_moore)
- [GitHub](https://github.com/natemoo-re)

## FAQ 

### What is resumability?

Resumability is "Lazy execution", it's the ability to build the "framework state" (component boundaries, etc) on the server, and have it exist on the client without re-executing the framework again. 

> This is in contrast to most frameworks, which will run the framework twice. Once on the server, and once on the client. (Hydration)

### What is JavaScript Streaming?

JavaScript streaming is Resumability plus the ability to stream the functions into the browser and to buffer them in the cache.

Functions and Closures are automatically extracted by the Qwik Optimizer. You can think of it like uploading a video to Youtube. They are in charge of the video streaming and chunking that video into tiny packets for you automatically.

### Where can I find Qwik UI components?

[Jack](https://twitter.com/thejackshelton) also works on a UI library called [Qwik UI](https://github.com/Qwikifiers/qwik-ui).

#### Headless

It has a headless library - similar to Radix UI, React Aria, Kobalte, Melt UI.

#### Styled

It has a styled library using Tailwind CSS - which is inspired by Shadcn UI.

The philosophy is simple, the components are html until your users decide it's not, building on top of Astro's opt-in design principle.

### Can I use it with React?

Yes! You can use it with React, but keep in mind those components will not get the benefits of JavaScript Streaming.

### Can I use it with Qwik City?

No, Qwik City is an alternative meta-framework for Qwik.




