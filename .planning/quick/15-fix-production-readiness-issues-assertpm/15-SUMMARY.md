---
phase: quick-15
plan: "01"
subsystem: create-qwikdev-astro/cli
tags: [error-handling, jsonc, testing, upgrade, panam]
dependency_graph:
  requires: []
  provides: [assertPmResult-coverage, jsonc-tsconfig-parsing, upgrade-test-jsonc]
  affects: [libs/create-qwikdev-astro/src/upgrade.ts, libs/create-qwikdev-astro/src/upgrade-rewrite.ts, libs/create-qwikdev-astro/src/app.ts, libs/create-qwikdev-astro/tests/upgrade.spec.ts]
tech_stack:
  added: []
  patterns: [assertPmResult-error-propagation, stripJsonComments-before-parse]
key_files:
  modified:
    - libs/create-qwikdev-astro/src/upgrade.ts
    - libs/create-qwikdev-astro/src/upgrade-rewrite.ts
    - libs/create-qwikdev-astro/src/app.ts
    - libs/create-qwikdev-astro/tests/upgrade.spec.ts
decisions:
  - "pm.dlx, pm.remove, pm.add in upgrade.ts now capture results and call assertPmResult — try/catch propagates thrown Error"
  - "pm.install in app.ts runInstall wrapped in try/catch; assertPmResult failure returns false early"
  - "upgrade-rewrite.ts uses stripJsonComments before JSON.parse so JSONC tsconfig files don't silently return unchanged"
metrics:
  duration: "~5min"
  completed: "2026-03-27T23:41:51Z"
  tasks: 2
  files: 4
---

# Quick Task 15: Fix Production Readiness Issues (assertPmResult) Summary

**One-liner:** Hardened panam error propagation with assertPmResult across upgrade.ts/app.ts and fixed silent JSONC tsconfig parse failure in upgrade-rewrite.ts.

## Tasks Completed

| # | Task | Commit | Files |
|---|------|--------|-------|
| 1 | Fix unchecked panam results in upgrade.ts and app.ts | 427e435 | upgrade.ts, app.ts |
| 2 | Fix JSONC tsconfig parsing; harden upgrade test | e8d1f61 | upgrade-rewrite.ts, upgrade.spec.ts |

## What Was Done

### Task 1: assertPmResult in upgrade.ts and app.ts

**upgrade.ts:**
- Added `assertPmResult` to the import from `./utils`
- `pm.dlx("@astrojs/upgrade")`: now captures `dlxResult` and calls `assertPmResult(dlxResult, "@astrojs/upgrade")` — the existing try/catch catches the thrown Error
- `pm.remove(toRemove)`: captures `removeResult` and asserts; failure pushes to `failures[]` and warns
- `pm.add(newPackages)`: captures `addResult` and asserts; failure pushes to `failures[]` and warns

**app.ts:**
- `pm.install()` in `runInstall()` wrapped in try/catch; `assertPmResult(installResult, "install dependencies")` called; caught error logs via `this.error()` and returns `false`

### Task 2: JSONC tsconfig parsing and test hardening

**upgrade-rewrite.ts:**
- Imported `stripJsonComments` from `./utils`
- `JSON.parse(content)` → `JSON.parse(stripJsonComments(content))` so tsconfig files with JSONC comments are parsed correctly instead of silently returning `{ changed: false }`

**upgrade.spec.ts:**
- `scaffoldOldProject` fixture tsconfig now uses JSONC format (has a `// This is a JSONC comment` line)
- Dry-run test updated to check raw string content (not `JSON.parse`) since the fixture file contains JSONC
- New unit test `"rewriteTsconfig handles JSONC comments in tsconfig"` added: creates a temp tsconfig with comments, calls `rewriteTsconfig(tmpDir, false)`, asserts `changed === true`, verifies written file has `@qwik.dev/core`

## Verification

- TypeScript: `npx tsc --noEmit` passes with no errors
- Tests: All 13 upgrade spec tests pass
- Biome: `pnpm biome check` passes on all 3 source files (2 format fixes applied)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing fix] Dry-run test used JSON.parse on JSONC fixture**
- **Found during:** Task 2 — updating fixture to use JSONC comments broke the dry-run test
- **Issue:** `dry-run does not modify files` test did `JSON.parse(readFileSync(...tsconfig.json...))` which would throw on JSONC input
- **Fix:** Replaced with raw string check: `assert.isTrue(tsconfigContent.includes('"@builder.io/qwik"'))`
- **Files modified:** libs/create-qwikdev-astro/tests/upgrade.spec.ts

**2. [Rule 1 - Format] Biome formatting drift in upgrade.ts and app.ts**
- **Found during:** Task 1 — pre-commit biome check flagged trailing blank line in upgrade.ts and tab-vs-space drift in app.ts
- **Fix:** `pnpm biome format --write` applied automatically
- **Files modified:** upgrade.ts, app.ts

## Self-Check

- [x] `libs/create-qwikdev-astro/src/upgrade.ts` — contains `assertPmResult`
- [x] `libs/create-qwikdev-astro/src/upgrade-rewrite.ts` — contains `stripJsonComments`
- [x] `libs/create-qwikdev-astro/src/app.ts` — contains `assertPmResult`
- [x] `libs/create-qwikdev-astro/tests/upgrade.spec.ts` — contains `rewriteTsconfig handles JSONC`
- [x] Commit 427e435 exists
- [x] Commit e8d1f61 exists
