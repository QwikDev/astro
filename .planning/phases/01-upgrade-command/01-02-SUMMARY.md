---
phase: 01-upgrade-command
plan: 02
subsystem: cli
tags: [typescript, cli, upgrade, migration, import-rewriting, package-swap]

# Dependency graph
requires:
  - phase: 01-upgrade-command
    plan: 01
    provides: UpgradeCommand skeleton, UpgradeInput type, upgrade-preflight.ts
provides:
  - upgrade-rewrite.ts with PACKAGE_MAP, walkFiles, rewriteFileImports, rewriteImports, rewriteTsconfig, rewriteAstroConfig, rewritePragmaComments, scanForAsyncPatterns
  - UpgradeCommand.execute() with full 7-step migration pipeline
  - dryRun support for all rewrite operations (log-only mode)
  - Async pattern detection warnings for useComputed$/useResource$
affects:
  - 01-upgrade-command plan 03 (summary report wiring)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Longest-key-first PACKAGE_MAP processing to prevent partial replacements (subpath before prefix)
    - Structured result objects from all rewrite functions (changed boolean + details)
    - Recursive directory walker with explicit skip-list (node_modules/dist/.astro/.git)
    - try/catch around each pipeline step — warn and continue rather than abort

key-files:
  created:
    - libs/create-qwikdev-astro/src/upgrade-rewrite.ts
  modified:
    - libs/create-qwikdev-astro/src/upgrade.ts

key-decisions:
  - "PACKAGE_MAP keys are processed longest-first to prevent @builder.io/qwik from overwriting already-replaced @builder.io/qwik/jsx-runtime subpath specifiers"
  - "rewritePragmaComments is a separate function for explicit pragma tracking even though rewriteImports covers the same string replacements — Plan 03 summary can report both independently"
  - "pm.x() failures in package swap and @astrojs/upgrade steps warn and continue rather than abort — partial migration is better than total failure"
  - "scanForAsyncPatterns returns structured results (file, line, pattern) for display in Plan 03 summary report"

patterns-established:
  - "Rewrite functions: accept (dir, dryRun), return structured { changed, ... } — all side-effect-free in dryRun mode"
  - "Pipeline step pattern: this.step() label, call rewrite fn, this.info() result summary, collect into results object"

requirements-completed: [UPG-04, UPG-05, UPG-06, UPG-07, UPG-08, UPG-09, UPG-10]

# Metrics
duration: 2min
completed: 2026-03-27
---

# Phase 1 Plan 02: Migration Pipeline — Import Rewriting and Package Swap Summary

**String-replacement migration pipeline covering @builder.io/qwik->@qwik.dev/core and @qwikdev/astro->@qwik.dev/astro across source files, tsconfig, astro.config, and pragma comments, with @astrojs/upgrade delegation and async pattern warnings**

## Performance

- **Duration:** ~2 min
- **Started:** 2026-03-27T02:18:02Z
- **Completed:** 2026-03-27T02:20:27Z
- **Tasks:** 2
- **Files modified:** 2 (1 created, 1 modified)

## Accomplishments
- `upgrade-rewrite.ts` created with full PACKAGE_MAP (7 entries) and 6 exported functions covering all rewrite/scan concerns
- `UpgradeCommand.execute()` replaced with 7-step migration pipeline: @astrojs/upgrade delegation, package swap, astro.config rewrite, tsconfig rewrite, source import rewriting, pragma comment rewriting, async pattern scanning
- All rewrite functions accept `dryRun` flag — in dry-run mode they log what would happen without writing any files
- TypeScript compiles cleanly with no errors

## Task Commits

Each task was committed atomically:

1. **Task 1: Create upgrade-rewrite.ts** - `e82ceb1` (feat)
2. **Task 2: Wire migration pipeline into UpgradeCommand.execute()** - `192d234` (feat)

## Files Created/Modified
- `libs/create-qwikdev-astro/src/upgrade-rewrite.ts` - PACKAGE_MAP, walkFiles, rewriteFileImports, rewriteImports, rewriteTsconfig, rewriteAstroConfig, rewritePragmaComments, scanForAsyncPatterns
- `libs/create-qwikdev-astro/src/upgrade.ts` - Full 7-step execute() pipeline with pm.x delegation, package swap, and all rewrite function calls

## Decisions Made
- PACKAGE_MAP keys are sorted longest-first before processing so that `@builder.io/qwik/jsx-runtime` is replaced before `@builder.io/qwik` — prevents the prefix replacement from corrupting already-replaced subpath specifiers
- `pm.x()` failures wrap in try/catch with `this.warn()` and continue — a partial migration is more useful than a hard abort, especially when `@astrojs/upgrade` is unavailable
- `rewritePragmaComments` is kept as a separate function even though `rewriteImports` already catches the same strings — it provides distinct tracking for the Plan 03 summary report to report pragma-changed files separately

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- All rewrite functions are implemented and exported — Plan 03 can import them directly for the summary report
- `results` object in `execute()` aggregates astroUpgradeRan, packagesSwapped, configRewritten, tsconfigRewritten, sourceFilesChanged, pragmaFilesChanged, asyncWarnings — ready to be surfaced in Plan 03's outro summary
- No blockers

---
*Phase: 01-upgrade-command*
*Completed: 2026-03-27*
