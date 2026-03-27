---
phase: quick-04
plan: 01
subsystem: create-qwikdev-astro/tests, create-qwikdev-astro/add-flow
tags: [tests, imports, warning-copy, add-exclude]
dependency_graph:
  requires: [quick-03]
  provides: [dist-free test execution, correct unsafe warning copy]
  affects: [libs/create-qwikdev-astro/tests, libs/create-qwikdev-astro/src/add-flow]
tech_stack:
  added: []
  patterns: [relative-imports-in-tests, add-exclude-strategy]
key_files:
  modified:
    - libs/create-qwikdev-astro/tests/api.spec.ts
    - libs/create-qwikdev-astro/tests/cli.spec.ts
    - libs/create-qwikdev-astro/src/add-flow/rewrite-config.ts
decisions:
  - "tests/*.spec.ts use ../src/*.js relative imports — no dist build needed before running tests"
  - "unsafe warning tells users to add exclude to other frameworks only (not include + qwik exclude) — matches quick-03 add-exclude strategy"
metrics:
  duration: ~5 minutes
  completed: "2026-03-27T03:55:10Z"
  tasks_completed: 2
  files_modified: 3
---

# Phase quick-04 Plan 01: Fix Test Imports and Unsafe Warning Copy Summary

**One-liner:** Switch test specs from package-name to relative source imports and align unsafe warning with add-exclude strategy from quick-03.

## Tasks Completed

| # | Task | Commit | Files |
|---|------|--------|-------|
| 1 | Replace package-name imports with relative source imports | cffa96c | tests/api.spec.ts, tests/cli.spec.ts |
| 2 | Update unsafe warning copy to match add-exclude strategy | 1ceaa22 | src/add-flow/rewrite-config.ts |

## What Was Done

### Task 1: Relative source imports in test specs

`tests/api.spec.ts` and `tests/cli.spec.ts` previously imported from `@qwik.dev/create-astro/*` package-name paths. These resolve through `package.json` exports to `dist/`, meaning `pnpm test` would silently run against stale compiled output unless `pnpm build` ran first.

Replaced all package-name imports with relative `../src/*.js` paths. The `.js` extension works with TypeScript's `"moduleResolution": "Bundler"` setting which resolves `.js` to `.ts` source files. The `@qwik.dev/create-astro/package.json` import was left as-is since it reads actual package metadata (name, version), not source.

**Mapping applied:**
- `@qwik.dev/create-astro` → `../src/index.js`
- `@qwik.dev/create-astro/app` → `../src/app.js`
- `@qwik.dev/create-astro/tester` → `../src/tester.js`
- `@qwik.dev/create-astro/upgrade` → `../src/upgrade.js`
- `@qwik.dev/create-astro/add` → `../src/add-flow/command.js`

### Task 2: Unsafe warning copy aligned with add-exclude strategy

The `generateWarning` unsafe case previously gave two-framework manual instructions: add `include` to non-Qwik frameworks AND add `exclude` to Qwik. This contradicts the quick-03 strategy where auto-config adds `exclude` to non-Qwik frameworks (Qwik's own exclude is not configured — it handles its own files).

Updated to give one instruction: add `exclude` to each non-Qwik framework pointing at `src/components/qwik/**/*`. Removed the Qwik configuration example entirely.

Existing test assertions (`warning.includes("spread")` and `warning.includes("manually")`) continue to pass since the new text still contains both words.

## Verification

Full test suite: **76 passed, 0 failed** (`pnpm test` in `libs/create-qwikdev-astro/`)

No remaining `@qwik.dev/create-astro/` imports in `tests/` (except `package.json`):
```
grep -r "@qwik.dev/create-astro/" libs/create-qwikdev-astro/tests/ | grep -v package.json
# (no output)
```

## Deviations from Plan

None — plan executed exactly as written. Existing test assertions for the unsafe warning passed without modification since "manually" and "spread" both appear in the updated warning text.

## Self-Check: PASSED

- `libs/create-qwikdev-astro/tests/api.spec.ts` — confirmed modified (relative imports)
- `libs/create-qwikdev-astro/tests/cli.spec.ts` — confirmed modified (relative imports)
- `libs/create-qwikdev-astro/src/add-flow/rewrite-config.ts` — confirmed modified (warning copy)
- Commit cffa96c — confirmed present
- Commit 1ceaa22 — confirmed present
- All 76 tests pass
