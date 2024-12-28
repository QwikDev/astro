# @qwikdev/astro

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
