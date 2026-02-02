# @qwikdev/astro

## 1.0.0

### Major Changes

- fd9074f: fix: return null instead of throwing on unresolved modules in resolveId

## 0.8.2

### Patch Changes

- 2af2e4a: feat: support global config for renderOpts

  You can now pass the `renderOpts` option to the `qwik` integration to set global render options for all Qwik components.

  For example, let's say we wanted to change the base URL for all Qwik build assets on every component used in an Astro file.

  ```ts
  import { defineConfig } from "astro/config";
  import qwik from "@qwikdev/astro";

  export default defineConfig({
    integrations: [
      qwik({ include: "**/qwik/*", renderOpts: { base: "my-cdn-url/build" } }),
    ],
  });
  ```

## 0.8.1

### Patch Changes

- 7d7b656: feat: Support Qwik Render Options at runtime on a per-component basis.

  This is useful for scenarios where you want to render a Qwik component in an Astro page, but you want to use a different base URL for the Qwik component, or another configuration.

  For example, if you want to render a Qwik component in an Astro page, but you want to use a different base URL for the Qwik component, you can pass the `renderOpts` prop to the Qwik component.

  ```astro
  <NativeCounter initial={2} renderOpts={{ base: "http://0.0.0.0:4321/build" }} />
  ```

  Make sure to import the `RenderOptions` type from `@builder.io/qwik/server` and pass it to the component for type safety.

  Want to make a change for all components? Create a global object config and pass it to each component.

## 0.8.0

### Minor Changes

- 823ff01: 🚀 Qwik Astro now supports the Qwik preloader! ⚡️

  ✨ Simplified loader mechanism
  🔄 Improved deployment support
  ⚙️ Enhanced Astro actions integration

  Read more in the upcoming blog post on the Qwik site.

## 0.7.12

### Patch Changes

- bcf04d0: - Fix Vercel builds failing force create serverchunks directory if needed
  - Fix Vercel Adapter Client Static Files Handling

## 0.7.11

### Patch Changes

- 0.7.11

## 0.7.10

### Patch Changes

- 54ee1d1: dev mode: preloader support

## 0.7.9

### Patch Changes

- 0013b58: fix: better handling for jsx transforms in inline components

  fix: when in Astro client router, conditionally affect the string append rather than the html return for visible task support.

## 0.7.8

### Patch Changes

- e6621dc: fix: efficiently scan barrel files

## 0.7.7

### Patch Changes

- 911821a: fix: q-manifest gets added into the bundled code at build time

## 0.7.6

### Patch Changes

- 87f657e: fix: improved manifest handling for deployment providers using older node versions

## 0.7.5

### Patch Changes

- 4d34b2b: fix: support for Astro navigate function and virtual modules

## 0.7.4

### Patch Changes

- a22283f: fix: client router now executes Qwik's visible tasks correctly

## 0.7.3

### Patch Changes

- 8d25080: refactor: improved errors for older node versions

## 0.7.2

### Patch Changes

- fa9e5a8: Added `.gitignore` file to the project and updated dependencies.

## 0.7.1

### Patch Changes

- 5baee12: ## 🎄 Qwik Astro CLI Holiday Update! 🎅

  This release introduces the ability to add Qwik to your existing Astro projects, with an improved CLI experience and better project integration.

  ### ✨ Core Features

  - ✨ New CLI command to add Qwik to existing Astro projects
  - 🚸 Improved interactive experience with smart defaults
  - 🎯 Simplified project setup with fewer required inputs
  - 🔄 Smarter handling of existing project names
  - ⚡️ Streamlined installation process

  ### 🔧 Improvements

  - 🎮 Enhanced interactive mode
  - ✅ Better validation of user inputs
  - 🔄 Smoother integration with existing projects
  - 🛠️ Improved handling of CLI options
  - 🚀 Faster project setup

  ### 🐛 Bug Fixes

  - 🪟 Fixed Windows compatibility issues
  - 🔧 Improved package manager detection
  - 🛠️ Better error handling and user feedback
  - 🔄 Fixed conflicts between CLI options

  ### 📦 Updates

  - ⬆️ Updated dependencies
  - 🔨 Improved build process
  - 📦 Better package structure

## 0.7.0

### Minor Changes

- 3786754: ## 🎄 Qwik Astro Holiday Update! (0.7) 🎅

  Special thanks to [Luiz Ferraz (Fryuni)](https://github.com/Fryuni) for his help with this release!

  ### ✨ What's New

  - 🚀 Added support for Astro 5
  - 🔄 Integrated Qwik's next-gen buffering system (First framework to support this!)
  - 📚 Added support for Qwik libraries
  - 🔍 New debug mode: `{ debug: true }`
  - 💨 Switched to `renderToStream` for better performance
  - 🧩 Improved inline Qwik components support ([#158](https://github.com/QwikDev/astro/issues/158))

  ### 🛠️ Under the Hood

  - ⚡️ Faster builds: Now using Vite for entrypoint detection
  - 🔧 Using latest version of Astro Integration Kit (18.0)
  - 🪟 Fixed Windows compatibility issues
  - 📁 Better `@astrojs/mdx` compatibility
  - 📁 A temp directory is no longer needed
  - 🌐 Full support for all Astro deployment platforms ([#179](https://github.com/QwikDev/astro/issues/179)):
    - Netlify
    - Vercel
    - Cloudflare
    - And more!

  ### 📦 Package Cleanup

  - Removed unnecessary dependencies:
    - `fs-extra`
    - `fs-move`
    - `vite-tsconfig-paths`
  - Simplified peer dependencies to `@builder.io/qwik >= 1.9.0`
  - Fixed missing dependencies ([#161](https://github.com/QwikDev/astro/issues/161))
  - Better respect for Astro config options ([#74](https://github.com/QwikDev/astro/issues/74), [#172](https://github.com/QwikDev/astro/issues/172))

## 0.6.3

### Patch Changes

- b2c242d: feat: support for inline components

## 0.6.2

### Patch Changes

- b531a03: update deps

## 0.6.1

### Patch Changes

- 736a04c: update versions

## 0.6.0

### Minor Changes

- 9aa38bb: refactor: major performance improvements

## 0.5.16

### Patch Changes

- 26889d2: fix: downgrade qwik version atm

## 0.5.15

### Patch Changes

- d63c45c: docs: Updated readme to include the CLI!

## 0.5.14

### Patch Changes

- 52d67b3: switch to changesets
