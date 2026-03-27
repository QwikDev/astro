---
phase: quick-fix
plan: 3
subsystem: create-qwikdev-astro/add-flow
tags: [bug-fix, add-flow, detect-config, test-runner]
dependency_graph:
  requires: []
  provides:
    - "Safe add-exclude edits that preserve existing framework file coverage"
    - "Test runner that works without a prior build step"
  affects:
    - libs/create-qwikdev-astro/src/add-flow/detect-config.ts
    - libs/create-qwikdev-astro/src/add-flow/detect-config.test.ts
    - libs/create-qwikdev-astro/bin/test.ts
tech_stack:
  added: []
  patterns:
    - "add-exclude instead of add-include for non-destructive framework coexistence"
    - "Source-relative import in tsx-run scripts to avoid build dependency"
key_files:
  created: []
  modified:
    - libs/create-qwikdev-astro/src/add-flow/detect-config.ts
    - libs/create-qwikdev-astro/src/add-flow/detect-config.test.ts
    - libs/create-qwikdev-astro/bin/test.ts
decisions:
  - "Use add-exclude (not add-include) so existing frameworks keep processing files in all directories"
  - "bin/test.ts imports from ../src/tester.js so tsx runs tests without prior build"
metrics:
  duration: "~4 min"
  completed: "2026-03-27"
  tasks_completed: 2
  tasks_total: 2
---

# Quick Task 3: Fix add-flow safe auto-config breaking existing frameworks

**One-liner:** Switch detect-config safe mode from add-include (restricting existing frameworks) to add-exclude (excluding only Qwik's directory), and fix test runner to import from source.

## What Was Done

### P1: Safe auto-config no longer breaks existing projects

The "safe" outcome in `detectConfigFrameworks` previously added `include` patterns that confined existing React/Preact/Solid integrations to `src/components/{name}/`. Any project files outside that directory — the normal case — would stop being processed by those frameworks.

Fixed by switching to `add-exclude` edits: existing frameworks now get `exclude: ["src/components/qwik/**/*"]` added, which simply tells them to skip Qwik's directory. They continue processing all files they already handle.

`rewrite-config.ts` already handled `add-exclude` correctly (maps `edit.type === "add-include" ? "include" : "exclude"`) — no changes needed there.

### P2: Test runner no longer requires a prior build

`bin/test.ts` imported `PathTester` from `@qwik.dev/create-astro/tester`, which resolves through package.json exports to `dist/tester.mjs`. Running tests on a fresh checkout failed with module-not-found.

Fixed by importing from `../src/tester.js` directly. Since `bin/test.ts` is executed via `pnpm tsx`, TypeScript source resolves at runtime without a build step. All 76 tests pass.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Switch detect-config from add-include to add-exclude + update tests | 3b60ca1 | detect-config.ts, detect-config.test.ts |
| 2 | Fix test runner to import tester from source instead of dist | 5c62ec7 | bin/test.ts |

## Verification

1. `npx tsx src/add-flow/detect-config.test.ts` — 24 assertions, 7 tests, 0 failures
2. `pnpm tsx bin/test.ts` — 76 tests pass, no build step required
3. `pnpm build` — build completes successfully in 534ms

## Deviations from Plan

None — plan executed exactly as written.

## Self-Check: PASSED

- [x] `libs/create-qwikdev-astro/src/add-flow/detect-config.ts` — modified, verified
- [x] `libs/create-qwikdev-astro/src/add-flow/detect-config.test.ts` — modified, verified
- [x] `libs/create-qwikdev-astro/bin/test.ts` — modified, verified
- [x] Commit 3b60ca1 — Task 1
- [x] Commit 5c62ec7 — Task 2
