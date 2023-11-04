# Contributing

Hey, Welcome to the contributing guide for `@qwikdev/astro`! We really appreciate your help.

## Qwik Start

You can quickly get up and running with the playground by doing the following:

1. clone this package:
   https://github.com/QwikDev/astro
   and run the command `pnpm install` or `pnpm i`

2. Once the dependencies are installed, you can build by running `pnpm build` in `apps/astro-demo`

That's it!

To see the preview, run `pnpm preview`. To see dev mode, run `pnpm dev`.

## Getting started

This project is a pnpm workspace monorepo. It contains:

- An Astro Demo app playground
- The `@qwikdev/astro` library.

Below is an outline of the file structure.

```
.
└── Project Structure/
    ├── apps/
    │   └── astro-demo/
    │       └── src/
    │           ├── components/
    │           │   └── counter.tsx
    │           └── pages/
    │               └── index.astro
    └── libs/
        └── qwikdev-astro/
            ├── src/
            │   └── index.ts
            ├── server.ts
            ├── types.ts
            ├── server.ts
            └── package.json
```

There are two major files to be aware of. `index.ts` and `server.ts`.

`qwikdev-astro/src/index.ts` is the entrypoint. It is where we define the Astro Integration. For a more in-depth look at how that is stuctured, you can visit [Astro's Integration API docs](https://docs.astro.build/en/reference/integrations-reference/).

Within the **index.ts** file we:

- Instantiate the integration
- Use Astro life cycle hooks `astro:config:setup` etc.
- Add the [Qwikloader script](https://qwik.builder.io/docs/advanced/qwikloader/#qwikloader) (once)
- Find and crawl any Qwik client entrypoints, which generates the client manifest.
- Pass the server entrypoint static path to the Astro Integration.
- Relocate built files between temp and final directories during the build.

We are also using `qwikVite`, a plugin that is part of the [Qwik Optimizer](https://qwik.builder.io/docs/advanced/optimizer/#optimizer). As both Astro & Qwik are built on top of [Vite](https://vitejs.dev/), this enables us to offer various configuration options for tailoring the interaction between Astro and Qwik.

Within the **server.ts** file we define and export as default three things that Astro is looking for internally:

1. check - this function will verify if a component can be rendered to static markup
2. renderToStaticMarkup - renders a component to a static markup string
3. indicates whether the renderer (qwik) supports Astro's static slot feature.

```tsx
const result = await renderToString(app, {
  containerTagName: "div",
  manifest: manifest,
  symbolMapper: manifest ? undefined : symbolMapper,
  qwikLoader: { include: "never" },
});
```

We're then able to use the [renderToString](https://qwik.builder.io/docs/advanced/containers/#container-attributes) function to SSR a Qwik container.

![An example of a Qwik container](https://i.imgur.com/hJJtRHj.jpeg)

You'll also notice something called the `symbolMapper`.

```tsx
const symbolMapper: SymbolMapperFn = (
  symbolName: string,
  mapper: SymbolMapper | undefined
) => {
  return [symbolName, "/src/" + symbolName.toLocaleLowerCase() + ".js"];
};
```

The symbolMapper function is like a librarian mapping a book to its shelf. It takes a symbolName and returns an array with the symbolName and the path to its corresponding JavaScript module.

For example, if symbolName is "MyComponent", it returns:

```
["MyComponent", "/src/mycomponent.js"].
```

We only use the symbolMapper in dev mode. This is because we already get this information from the manifest during the build. Here, the symbolMapper serves as a fallback to ensure that dev mode works correctly.

```tsx
 symbolMapper: manifest ? undefined : symbolMapper,
```

That's about it! Some exciting features we would like to add to Qwik + Astro are:

- Similar [prefetching](https://qwik.builder.io/docs/advanced/speculative-module-fetching/#speculative-module-fetching) functionality to Qwik City
- [Qwik Insights](https://qwik.builder.io/docs/labs/insights/#-insights)
