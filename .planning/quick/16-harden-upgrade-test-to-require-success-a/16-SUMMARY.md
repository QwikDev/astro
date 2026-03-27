---
phase: quick-16
plan: 01
subsystem: create-qwikdev-astro/tests
tags: [testing, upgrade, add-flow, e2e, hardening]
dependency_graph:
  requires: []
  provides: [hardened-upgrade-test, react-e2e-add-test]
  affects: [upgrade.spec.ts, add-flow-unification.spec.ts]
tech_stack:
  added: []
  patterns: [unconditional-assert, stripJsonComments, real-install-e2e]
key_files:
  created: []
  modified:
    - libs/create-qwikdev-astro/tests/upgrade.spec.ts
    - libs/create-qwikdev-astro/tests/add-flow-unification.spec.ts
decisions:
  - "Upgrade test now unconditionally requires success — no silent failure paths allowed in CI"
  - "React e2e test uses --yes (real install) with writeReactAstroProjectNoQwik so astro add actually executes"
metrics:
  duration: ~5min
  completed: "2026-03-27"
  tasks_completed: 2
  files_modified: 2
---

# Phase Quick-16 Plan 01: Harden Upgrade Test and Add React E2E Summary

**One-liner:** Unconditional upgrade success assertion with JSONC tsconfig fix; new React-only --add e2e test exercising the full install + astro add + config rewrite pipeline.

## Tasks Completed

| # | Name | Commit | Files |
|---|------|--------|-------|
| 1 | Harden upgrade full test to require success unconditionally | cf24517 | libs/create-qwikdev-astro/tests/upgrade.spec.ts |
| 2 | Add React-only e2e --add test with real install | 99e89f2 | libs/create-qwikdev-astro/tests/add-flow-unification.spec.ts |

## What Was Built

### Task 1: Hardened Upgrade Test

The "full upgrade swaps packages and rewrites files" test previously had an `if (result.isSuccess()) { ... } else { assert.isTrue(result.isFailure()) }` guard that silently passed when `@astrojs/upgrade` dlx failed. This meant CI could pass even if the upgrade pipeline was completely broken.

Changes made to `upgrade.spec.ts`:
- Removed the if/else conditional entirely
- Replaced with `assert.isTrue(result.isSuccess(), ...)` that includes the actual exit code in the failure message
- All subsequent assertions (config rewrite, tsconfig, counter.tsx, package.json deps) run unconditionally
- Fixed JSONC tsconfig parsing: `JSON.parse(stripJsonComments(readFileSync(...)))` instead of bare `JSON.parse`
- Added `import { stripJsonComments } from "../src/utils.js"` at top of file

### Task 2: React E2E Add Test

Added full e2e coverage for the `--add` flow on a React-only project with real package installation.

New additions to `add-flow-unification.spec.ts`:
- `writeReactAstroProjectNoQwik()` helper: creates a React+Astro fixture WITHOUT qwik registered, so the `astro add @qwik.dev/astro` step actually executes (not short-circuited by the alreadyRegistered guard)
- New test group `--add e2e with real install (React project)` with `disableTimeout()`
- Test flow: scaffold fixture → `pm.install()` → intercept JSX prompt with "secondary" → `run([..., "--add", "--yes"])` → assert all outcomes
- Assertions: exit code 0, config contains `qwik`, config contains `react(`, config contains `exclude`, tsconfig `jsxImportSource` stays `"react"` (secondary strategy), Counter.tsx exists with `/** @jsxImportSource @qwik.dev/core */` pragma

## Verification

All 127 tests pass (up from 126 before Task 2):

```
Tests  127 passed (127)
Time   1m
```

## Deviations from Plan

None — plan executed exactly as written.

## Self-Check: PASSED

- `libs/create-qwikdev-astro/tests/upgrade.spec.ts` — modified, contains `assert.isTrue(result.isSuccess()` and `stripJsonComments`
- `libs/create-qwikdev-astro/tests/add-flow-unification.spec.ts` — modified, contains `pm.install` and `writeReactAstroProjectNoQwik`
- Commit cf24517 — Task 1
- Commit 99e89f2 — Task 2
