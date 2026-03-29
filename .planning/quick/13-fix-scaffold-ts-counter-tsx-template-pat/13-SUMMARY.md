---
phase: quick-13
plan: 01
subsystem: create-qwikdev-astro/add-flow
tags: [bug-fix, template-path, scaffold, bundled-cli, tdd]
dependency_graph:
  requires: []
  provides: [fixed-scaffold-template-path]
  affects: [libs/create-qwikdev-astro/src/add-flow/scaffold.ts]
tech_stack:
  added: []
  patterns: [shared-__dirname-from-utils, single-traversal-to-package-root]
key_files:
  modified:
    - libs/create-qwikdev-astro/src/add-flow/scaffold.ts
    - libs/create-qwikdev-astro/tests/jsx-strategy.spec.ts
decisions:
  - scaffold.ts imports shared __dirname from utils.ts (not local import.meta.url) matching app.ts proven pattern
  - COUNTER_TEMPLATE_PATH uses single '..' traversal from entry-point __dirname to reach package root stubs/
metrics:
  duration: 5min
  completed: "2026-03-27"
  tasks_completed: 2
  files_modified: 2
---

# Phase quick-13 Plan 01: Fix scaffold.ts Counter.tsx Template Path Summary

**One-liner:** Fixed Counter.tsx template path in scaffold.ts from broken `../../stubs` (local import.meta.url) to shared `__dirname` from utils.ts with single `..` traversal, matching app.ts proven pattern for bundled dist/ CLI.

## What Was Done

`scaffold.ts` computed its own `__dirname` via `fileURLToPath(import.meta.url)` and joined `../../stubs/...` assuming it runs from `src/add-flow/`. When tsdown bundles it into `dist/scaffold-*.mjs`, the two parent-directory traversals exit the package root entirely — the template file cannot be found.

The fix imports the shared `__dirname` from `utils.ts` (a top-level entry point whose `__dirname` resolves to `dist/`) and uses one level up (`..`) to reach `stubs/` — exactly matching the proven pattern in `app.ts`.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Add failing regression test for template path | 7fd58b2 | tests/jsx-strategy.spec.ts |
| 2 | Fix scaffold.ts to use shared __dirname from utils.ts | c64565b | src/add-flow/scaffold.ts |

## Deviations from Plan

None - plan executed exactly as written.

## Verification Results

- All 122 tests pass (121 before + 1 new regression test)
- scaffold.ts no longer imports from `node:url`
- scaffold.ts imports `__dirname` from `../utils.js`
- COUNTER_TEMPLATE_PATH uses single `..` traversal (not `../..`)
- No unused imports remain (`fileURLToPath`, `dirname` both removed)

## Self-Check: PASSED

- `libs/create-qwikdev-astro/src/add-flow/scaffold.ts` — modified, verified
- `libs/create-qwikdev-astro/tests/jsx-strategy.spec.ts` — modified, verified
- Commit 7fd58b2 — FOUND
- Commit c64565b — FOUND
