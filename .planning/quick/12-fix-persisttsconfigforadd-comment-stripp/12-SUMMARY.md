---
phase: quick-12
plan: 01
subsystem: create-qwikdev-astro CLI
tags: [bug-fix, jsonc, tsconfig, tdd, refactor]
dependency_graph:
  requires: []
  provides: [stripJsonComments shared utility, JSONC-safe persistTsconfigForAdd]
  affects: [libs/create-qwikdev-astro/src/utils.ts, libs/create-qwikdev-astro/src/app.ts, libs/create-qwikdev-astro/src/add-flow/command.ts]
tech_stack:
  added: []
  patterns: [TDD red-green, shared utility extraction]
key_files:
  created: []
  modified:
    - libs/create-qwikdev-astro/src/utils.ts
    - libs/create-qwikdev-astro/src/app.ts
    - libs/create-qwikdev-astro/src/add-flow/command.ts
    - libs/create-qwikdev-astro/tests/add-flow-unification.spec.ts
decisions:
  - "JSONC test fixture uses qwik() already-registered config so astro add is skipped by alreadyRegistered guard — allows testing persistTsconfigForAdd in isolation without full astro install"
  - "stripJsonComments extracted to utils.ts as exported function — command.ts private copy removed"
metrics:
  duration: ~7 minutes
  completed: 2026-03-27
  tasks_completed: 2
  files_modified: 4
---

# Phase quick-12 Plan 01: Fix persistTsconfigForAdd JSONC Comment Stripping Summary

**One-liner:** Extracted `stripJsonComments` to `utils.ts` and fixed `persistTsconfigForAdd` in `app.ts` to strip JSONC comments before `JSON.parse`, eliminating silent parse failures on Astro projects with commented tsconfig files.

## What Was Built

### Problem
`persistTsconfigForAdd` in `app.ts` called bare `JSON.parse(tsconfigRaw)` without stripping comments. Astro projects commonly ship `tsconfig.json` in JSONC format (with `//` and `/* */` comments). This caused a silent `catch { return; }` — the tsconfig update was skipped entirely, meaning `jsxImportSource` was never written.

`command.ts` had a correct private `stripJsonComments` method but it was duplicated and not shared.

### Fix
1. **`utils.ts`**: Added exported `stripJsonComments(text: string): string` — handles single-line comments, block comments, string literal preservation, and trailing comma removal.
2. **`app.ts`**: Changed `JSON.parse(tsconfigRaw)` to `JSON.parse(stripJsonComments(tsconfigRaw))` in `persistTsconfigForAdd`. Added `stripJsonComments` to the import from `./utils`.
3. **`command.ts`**: Added `stripJsonComments` to import from `../utils.js`. Changed `this.stripJsonComments(tsconfigRaw)` to `stripJsonComments(tsconfigRaw)`. Removed the private `stripJsonComments` class method (34 lines of duplication eliminated).

### Test (TDD)
Added JSONC regression test to `add-flow-unification.spec.ts`:
- Helper `writeReactAstroProjectJsoncTsconfig` creates a fixture with JSONC tsconfig (comments on every field) and `qwik()` already registered (so `astro add` is skipped by the `alreadyRegistered` guard)
- Test intercepts JSX strategy prompt with "primary", runs `--add --no`, asserts exit code 0, then asserts `JSON.parse(tsconfigRaw)` does not throw and `jsxImportSource` is `"@qwik.dev/core"`

RED: test failed with `SyntaxError: Unexpected token '/', "// TypeScr"... is not valid JSON` (tsconfig unchanged as JSONC after silent catch)
GREEN: all 121 tests pass after fix

## Decisions Made

| Decision | Rationale |
|----------|-----------|
| JSONC test fixture keeps `qwik()` in config | Without qwik registered, `astro add` runs and fails (astro not installed in fixture dir). The `alreadyRegistered` guard is the correct way to isolate `persistTsconfigForAdd` in unit tests. |
| Utility in `utils.ts` not a standalone module | `stripJsonComments` is a small pure function; `utils.ts` is already the shared utility layer for this package. |

## Deviations from Plan

### Deviation: JSONC test fixture uses already-registered qwik config (not fresh no-qwik project)

**Found during:** Task 1 implementation
**Issue:** The plan specified a fixture without qwik in config to exercise the "real add-Qwik path." However, without `qwik()` registered, `alreadyRegistered` is false, triggering `pm.x("astro add @qwik.dev/astro")` which fails because astro is not installed in the tmp fixture directory. This masks the actual JSONC bug.
**Fix:** Used a fixture with `qwik()` already in `astro.config.mjs` (making `alreadyRegistered = true`, skipping `astro add`), while keeping the JSONC-commented tsconfig. This correctly isolates and tests `persistTsconfigForAdd`.
**Impact:** Test still proves the bug and fix — the `alreadyRegistered` path is the appropriate test harness for `persistTsconfigForAdd`.

## Self-Check: PASSED

- FOUND: libs/create-qwikdev-astro/src/utils.ts (stripJsonComments exported at line 316)
- FOUND: libs/create-qwikdev-astro/src/app.ts (stripJsonComments imported and used in persistTsconfigForAdd)
- FOUND: libs/create-qwikdev-astro/src/add-flow/command.ts (stripJsonComments imported from utils, private copy removed)
- FOUND: test commit 6fe05e9 (RED: failing JSONC test)
- FOUND: feat commit 37d2498 (GREEN: fix + shared utility)
