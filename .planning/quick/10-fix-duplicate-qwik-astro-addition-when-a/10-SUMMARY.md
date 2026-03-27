---
phase: quick
plan: "10"
subsystem: create-qwikdev-astro/add-flow
tags: [bug-fix, ast, detect-config, add-flow, regression-test]
dependency_graph:
  requires: []
  provides: [isQwikRegistered, duplicate-prevention]
  affects:
    - libs/create-qwikdev-astro/src/add-flow/detect-config.ts
    - libs/create-qwikdev-astro/src/app.ts
    - libs/create-qwikdev-astro/src/add-flow/command.ts
    - libs/create-qwikdev-astro/tests/add-existing-qwik.spec.ts
tech_stack:
  added: []
  patterns: [oxc-parser AST walking, conservative-detection]
key_files:
  created: []
  modified:
    - libs/create-qwikdev-astro/src/add-flow/detect-config.ts
    - libs/create-qwikdev-astro/src/app.ts
    - libs/create-qwikdev-astro/src/add-flow/command.ts
    - libs/create-qwikdev-astro/tests/add-existing-qwik.spec.ts
decisions:
  - isQwikRegistered uses conservative detection — only returns true for inline defineConfig with literal array; variable-exported and callback configs return false (safe fallback so astro add still runs)
  - installQwik in command.ts receives qwikRegistered as a boolean parameter rather than re-reading config, keeping the detection logic in execute()
  - Pre-install (hasQwikImport) still runs even when qwikRegistered is true — avoids crash if the package is missing from node_modules
metrics:
  duration: "~4 min"
  completed: "2026-03-27"
  tasks_completed: 3
  files_modified: 4
---

# Phase Quick Plan 10: Fix Duplicate qwik() Addition When Already Registered Summary

**One-liner:** AST-based `isQwikRegistered()` prevents duplicate `qwik()` integration entries by skipping `astro add` when the integration is already present in the config.

## What Was Built

Fixed a bug where running `--add` on a project that already had `qwik()` in its `integrations` array would cause `astro add @qwik.dev/astro` to run again, inserting a second `qwikDev()` call alongside the existing `qwik()`.

**Root cause:** Both `app.ts:runAdd` and `command.ts:installQwik` unconditionally called `astro add` even when the integration was already registered.

**Fix:** Added `isQwikRegistered(configSource: string): boolean` to `detect-config.ts` that uses the existing oxc-parser AST walking pattern to check if a `@qwik.dev/astro` binding is called in the `integrations` array. Both add paths now check this before running `astro add`.

## Tasks Completed

| Task | Description | Commit |
|------|-------------|--------|
| 1 | Add `isQwikRegistered()` to detect-config.ts | 4010aa8 |
| 2 | Use `isQwikRegistered` in app.ts and command.ts to conditionally skip astro add | fce7c3a |
| 3 | Add `isQwikRegistered` unit tests and regression test | 3b4a499 |

## Key Design Decisions

**Conservative detection** — `isQwikRegistered` only returns `true` for the most common config pattern: `export default defineConfig({ integrations: [qwik()] })`. Variable-exported configs (`const config = defineConfig(...); export default config`) and callback configs (`defineConfig(() => ({...}))`) return `false`. This is intentional: false negatives are safe (astro add runs harmlessly on a fresh project or adds the integration if missing), while false positives would incorrectly skip needed setup.

**Pre-install still runs when registered** — `hasQwikImport` check for pre-install is preserved even when `isQwikRegistered` is true. If the package is somehow missing from node_modules but the import exists, `astro add` would crash. Pre-installing first prevents that crash, and then we skip the redundant `astro add` call.

**Parameter threading** — `installQwik` in `command.ts` receives `qwikRegistered` as a boolean, keeping detection logic centralized in `execute()` where `configSource` is already available.

## Test Coverage

- 5 unit tests for `isQwikRegistered` covering all config shapes
- Regression test asserting config has exactly 1 `qwik()` call (and no `qwikDev` alias) after `--add` on a project with `INLINE_CONFIG`
- All 14 tests pass (9 previous + 5 new `isQwikRegistered` + 1 new regression)

## Deviations from Plan

None — plan executed exactly as written.

## Self-Check

- [x] `detect-config.ts` modified — confirmed
- [x] `app.ts` modified — confirmed
- [x] `command.ts` modified — confirmed
- [x] `add-existing-qwik.spec.ts` modified — confirmed
- [x] Commit 4010aa8 exists — confirmed
- [x] Commit fce7c3a exists — confirmed
- [x] Commit 3b4a499 exists — confirmed
- [x] All 14 tests pass — confirmed

## Self-Check: PASSED
