---
phase: 03-integration
plan: 01
subsystem: cli-entrypoint
tags: [cli, routing, add-flow, upgrade, integration]
dependency_graph:
  requires:
    - "01-upgrade-command: UpgradeCommand class"
    - "02-multi-framework-add-flow: detect-config, detect-source, rewrite-config, jsx-strategy, scaffold modules"
  provides:
    - "AddCommand class orchestrating multi-framework add-flow pipeline"
    - "CLI entrypoint routing upgrade/add subcommands"
  affects:
    - "libs/create-qwikdev-astro/src/index.ts"
    - "libs/create-qwikdev-astro/src/add-flow/command.ts"
tech_stack:
  added: []
  patterns:
    - "Program<TDef, TInput> extension pattern from core.ts (same as UpgradeCommand)"
    - "Subcommand stripping before delegating to yargs instance with '* [directory]' pattern"
key_files:
  created:
    - libs/create-qwikdev-astro/src/add-flow/command.ts
  modified:
    - libs/create-qwikdev-astro/src/index.ts
decisions:
  - "rewriteConfig actual signature is 2-param (source, result) not 4-param as plan interface showed — used actual implementation"
  - "subcommand detection uses args.slice(2).find(not-flag) to correctly skip flags before finding subcommand name"
metrics:
  duration: 2min
  completed: 2026-03-27
  tasks_completed: 2
  files_created: 1
  files_modified: 1
---

# Phase 3 Plan 1: CLI Integration Summary

AddCommand class + CLI routing so `create-qwikdev-astro upgrade [dir]` and `create-qwikdev-astro add [dir]` reach their respective Program instances through a single binary.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Create AddCommand orchestrating add-flow pipeline | 0347d63 | libs/create-qwikdev-astro/src/add-flow/command.ts |
| 2 | Wire upgrade and add subcommands into CLI entrypoint | 59432f4 | libs/create-qwikdev-astro/src/index.ts |

## What Was Built

### AddCommand (src/add-flow/command.ts)

- Extends `Program<AddDefinition, AddInput>` following the same pattern as UpgradeCommand
- `configure()`: strict/interactive yargs with `* [directory]` command, `--dryRun` flag, `--yes`/`--no` flags
- `validate()`: resolves `absDir` from directory string, returns `AddInput`
- `interact()`: prompts for directory when using the default `.` value
- `execute()` orchestration:
  1. Searches for `astro.config` with extensions `.mts`, `.ts`, `.mjs`, `.js`
  2. No config found: runs `astro add @qwik.dev/astro`, scaffolds with primary strategy
  3. Calls `detectConfigFrameworks()` and `detectSourceFrameworks()` on the project
  4. `"none"`: no other frameworks, adds Qwik as primary
  5. `"unsafe"` / `"already-configured"`: warns via `generateWarning()`, runs astro add, scaffolds primary
  6. `"safe"`: prompts for primary/secondary JSX choice, rewrites config, scaffolds with chosen strategy, runs astro add
- Exports `add()` factory and `export default add()`

### CLI Entrypoint (src/index.ts)

- Imports `upgradeApp` from `./upgrade.js` and `addApp` from `./add-flow/command.js`
- `run(args)` detects subcommand as first non-flag argument at index >= 2
- `"upgrade"`: strips subcommand from args, delegates to `upgradeApp.run(filtered)`
- `"add"`: strips subcommand, delegates to `addApp.run(filtered)`
- Default: delegates to existing `app.run(args)` for project creation
- Stripping is necessary because each Program uses `* [directory]` pattern where unstripped subcommand would be parsed as directory

## Dependency Confirmation

- `oxc-parser`: `^0.121.0` in `libs/create-qwikdev-astro/package.json` dependencies — confirmed present
- `magic-string`: `^0.30.21` in `libs/create-qwikdev-astro/package.json` dependencies — confirmed present

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] rewriteConfig 2-param vs 4-param signature mismatch**
- **Found during:** Task 1 implementation
- **Issue:** Plan interface showed `rewriteConfig(configSource, result, qwikInclude, qwikExclude)` with 4 parameters, but actual implementation in `rewrite-config.ts` only accepts 2 parameters `(source, result)`
- **Fix:** Called `rewriteConfig(configSource, configResult)` matching the actual implementation
- **Files modified:** libs/create-qwikdev-astro/src/add-flow/command.ts

## Self-Check: PASSED

- libs/create-qwikdev-astro/src/add-flow/command.ts: FOUND
- libs/create-qwikdev-astro/src/index.ts: MODIFIED
- Commit 0347d63: FOUND
- Commit 59432f4: FOUND
- TypeScript: compiles without errors
- oxc-parser and magic-string: confirmed in package.json
