# Contributing

Hey, Welcome to the contributing guide for `@qwikdev/astro`! We really appreciate your help.

## Qwik Start

You can quickly get up and running with the playground by doing the following:

1. clone this package:
   https://github.com/QwikDev/astro
   and run the command `pnpm install` or `pnpm i`

2. Once the dependencies are installed, you can build by running `pnpm build` in `apps/astro-demo`

That's it!

- dev: `pnpm dev`
- build: `pnpm build`
- preview: `pnpm preview`

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
            ├── README.md
            ├── tsconfig.json
            ├── env.d.ts
            └── package.json
```

There are two major files to be aware of. `index.ts` and `server.ts`.

`qwikdev-astro/src/index.ts` is the integration entrypoint. It is where we define the Astro Integration. For a more in-depth look at how that is stuctured, you can visit [Astro's Integration API docs](https://docs.astro.build/en/reference/integrations-reference/).

## index.ts

### Astro Hooks

Astro hooks are functions that are called at specific points during the build process. In this file, we define the following hooks:

- "astro:config:setup": This hook is used to set up the configuration for the Astro project. It retrieves Qwik files from the project source directory, adds the [renderer](https://docs.astro.build/en/reference/integrations-reference/#addrenderer-option), injects the [QwikLoader script](https://qwik.builder.io/docs/advanced/qwikloader/#qwikloader), and updates the Vite configuration.

- "astro:config:done": This hook is used to update the astroConfig after the configuration setup is done.

- "astro:build:start": This hook is called at the start of the build process. It initiates the build and moves the build artifacts to a temporary directory.

- "astro:build:done": This hook is called at the end of the build process. It moves the build artifacts from the temporary directory to the final output directory and removes the temporary directory.

### Helper Functions

The `index.ts` file also includes several helper functions:

- hash: This function generates a random string that is used as part of the temporary directory name.

- moveArtifacts: This function moves files from one directory to another. It's used to move the build artifacts from the temporary directory to the final output directory.

- crawlDirectory: This function recursively traverses a directory and returns an array of all the files in that directory and its subdirectories.

- getQwikEntrypoints: This function finds all the Qwik entrypoints in a given directory. These entrypoints are needed for the client build to run successfully.

We are also using `qwikVite`, a plugin that is part of the [Qwik Optimizer](https://qwik.builder.io/docs/advanced/optimizer/#optimizer). As both Astro & Qwik are built on top of [Vite](https://vitejs.dev/), this enables us to offer various configuration options for tailoring the interaction between Astro and Qwik.

#### Why another build step from vite?

If we look at `index.ts` in the `astro:build:start` hook, this is where we build the client.

```tsx
  "astro:build:start": async ({ logger }) => {
    logger.info("astro:build:start");
    if ((await entrypoints).length > 0) {

      // client build here
      await build({ ...astroConfig?.vite });


      await moveArtifacts(distDir, tempDir);
    } else {
      logger.info("No entrypoints found. Skipping build.");
    }
  },
```

Unlike other integrations, Qwik needs to pass the client build into the server build. We do that with the code above.

### How do we get the Qwik Entrypoints?

We currently get them using an [Abstract Syntax Tree](https://levelup.gitconnected.com/understanding-abstract-syntax-trees-ast-in-software-development-e8c2b1957f0a). Then, we traverse the tree and check if the node is an import declaration, string literal, and contains "@builder.io/qwik".

## server.ts

Within the **server.ts** file we have two functions that Astro is looking for internally:

### Check Function

The check function verifies if a component can be rendered to static markup. It checks if the component is a function and if its name is "QwikComponent". If these conditions are met, it calls the renderToStaticMarkup function and returns true if the result is a string.

### renderToStaticMarkup

The `renderToStaticMarkup` function renders a component to a static markup string.

It first checks if the component's name is "QwikComponent", ensuring we only render components from Qwik.

```tsx
const result = await renderToString(app, {
  containerTagName: "div",
  containerAttributes: { style: "display: contents" },
  manifest: isDev ? ({} as QwikManifest) : manifest,
  symbolMapper: manifest ? undefined : symbolMapper,
  qwikLoader: { include: "never" },
});
```

We're then able to use the [renderToString](https://qwik.builder.io/docs/advanced/containers/#container-attributes) function to SSR a Qwik container.

![An example of a Qwik container](https://i.imgur.com/hJJtRHj.jpeg)

### Symbol Mapper

Below is the `symbolMapper`.

```tsx
const symbolMapper: SymbolMapperFn = (symbolName: string) => {
  return [
    symbolName,
    `/${process.env.SRC_DIR}/` + symbolName.toLocaleLowerCase() + ".js",
  ];
};
```

The symbolMapper function is like a librarian mapping a book to its shelf.

Inside of the symbolMapper are [symbols](https://qwik.builder.io/docs/guides/bundle/#symbols-vs-chunks). Highly suggest reading the Qwik documentation to understand what a symbol is.

The `symbolMapper`function takes a `symbolName` parameter and returns an array with the symbolName and the path to its corresponding JavaScript module.

For example, the symbolName of our `click` event in `astro-demo` is:
`Counter_component_button_onClick_dKTK802O6SY`

As a result, symbol mapper returns:

```
Counter_component_button_onClick_dKTK802O6SY /src/counter_component_button_onclick_dktk802o6sy.js
```

We only use the symbolMapper in dev mode. This is because we already get this information from the manifest during the build. Here, the symbolMapper serves as a fallback to ensure that dev mode works correctly.

```tsx
 symbolMapper: manifest ? undefined : symbolMapper,
```

### What's the manifest?

A full graph of all of the symbols and their corresponding chunks. It also knows the import graph, so if a symbol is prefetched, the service worker will also prefetch all other symbols which are needed as part of the import graph.

That's about it! Some exciting features we would like to add to Qwik + Astro are:

- Similar [prefetching](https://qwik.builder.io/docs/advanced/speculative-module-fetching/#speculative-module-fetching) functionality to Qwik City
- [Qwik Insights](https://qwik.builder.io/docs/labs/insights/#-insights)
