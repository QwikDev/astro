# @qwikdev/create-astro

## 1.0.3

### Patch Changes

- Fix the package test script and release the CLI package alongside the latest Astro integration.

## 0.2.3

### Patch Changes

- 01db52b: Fix unresolved module handling and update build tooling

  ### Fixes

  - Return `null` instead of throwing on unresolved modules in `resolveId`

  ### Chore

  - Migrate build tooling from `tsup` to `tsdown`

## 0.2.2

### Patch Changes

- 98d18e6: `@astrojs/deno` is no longer maintained. Use `@deno/astro-adapter`.

## 0.2.1

### Patch Changes

- 6fe70b5: feat: update stub versions

## 0.2.0

### Minor Changes

- 823ff01: 🚀 Qwik Astro now supports the Qwik preloader! ⚡️

  ✨ Simplified loader mechanism
  🔄 Improved deployment support
  ⚙️ Enhanced Astro actions integration

  Read more in the upcoming blog post on the Qwik site.

## 0.1.6

### Patch Changes

- 700151a: # CLI Enhancement

  - Added `--copy` option to copy files safely
  - Updated documentation with examples and use cases.

## 0.1.5

### Patch Changes

- ed532ea: ### 🚀 Patch Changes

  - **🔄 Default Value for Overwriting Existing Directory**:
    The default value for overwriting an existing directory is now set to `false`. This ensures that users must explicitly confirm overwriting a directory, preventing accidental data loss. 🎯
  - **📂 Default Project Destination Path**:
    The default destination path for new projects has been updated to `./qwik-astro-app` instead of `.` or `./`. This provides a more intuitive approach, creating a dedicated folder for the new project rather than placing it directly in the current directory. 📁
  - **🐞 Bug Fixes**:
    Fixed several issues related to the execution of the CLI, ensuring a smoother user experience and better stability. 🛠️
  - **🌟 Support for Astro Templates**:
    Introduced the `--template` or `-t` argument to allow users to start a project from a specific Astro template, with Qwik configured on top. This adds flexibility for users looking to customize their projects right from the start. ✨

## 0.1.4

### Patch Changes

- fa9e5a8: Added `.gitignore` file to the project and updated dependencies.

## 0.1.3

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

## 0.1.2

### Patch Changes

- b531a03: update deps

## 0.1.1

### Patch Changes

- 736a04c: update versions

## 0.1.0

### Minor Changes

- 9aa38bb: refactor: major performance improvements

## 0.0.6

### Patch Changes

- 6d6fc95: fix: downgrade to 1.5.6

## 0.0.5

### Patch Changes

- efff9da: 🚸 Adapt the CI and the package.json file to the dependency manager used

## 0.0.4

### Patch Changes

- cbca1d3: 🚸 Improve user experience

## 0.0.3

### Patch Changes

- 162b289: Add next steps to start the project 🚀

## 0.0.2

### Patch Changes

- 9240d05: Update favicon and fix dependencies

## 0.0.1

### Patch Changes

- afe3d3b: Initial release of @qwikdev/create-astro 🚀
