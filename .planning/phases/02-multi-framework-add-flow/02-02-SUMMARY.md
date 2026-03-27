---
phase: 02-multi-framework-add-flow
plan: "02"
subsystem: cli
tags: [magic-string, config-rewriting, typescript, tdd, ast-editing]

requires:
  - phase: 02-multi-framework-add-flow
    plan: "01"
    provides: "MultiFrameworkResult, ConfigEdit, DetectionOutcome type contracts and detectConfigFrameworks"

provides:
  - "rewriteConfig: magic-string-based engine that applies add-include/add-exclude edits to astro.config source"
  - "generateWarning: human-readable warning messages for unsafe/already-configured outcomes"

affects:
  - 02-multi-framework-add-flow

tech-stack:
  added: [magic-string]
  patterns:
    - "TDD: failing test committed before implementation"
    - "magic-string overwrite/prependRight for character-position-based source edits"
    - "DetectionOutcome gates rewriting: only 'safe' outcome proceeds, all others return null"

key-files:
  created:
    - libs/create-qwikdev-astro/src/add-flow/rewrite-config.ts
    - libs/create-qwikdev-astro/src/add-flow/rewrite-config.test.ts
  modified:
    - libs/create-qwikdev-astro/package.json

key-decisions:
  - "magic-string prependRight for empty-arg calls (react()) — overwrite on zero-length range throws"
  - "appendLeft after opening brace for existing-args calls (react({ ssr: true })) to prepend new property"
  - "rewriteConfig returns null for non-safe outcomes — caller uses generateWarning for messaging"

patterns-established:
  - "Config edits use ConfigEdit.span character positions (from oxc-parser AST) for exact placement"
  - "generateWarning covers all 4 DetectionOutcome values including empty string for 'none' and 'safe'"

requirements-completed: [MFD-04, MFD-05, MFD-06]

duration: 3min
completed: 2026-03-27
---

# Phase 02 Plan 02: Config Rewriting Engine Summary

**magic-string config rewriter that inserts include/exclude properties into astro.config integration calls using AST span positions, with warning generation for unsafe/already-configured outcomes**

## Performance

- **Duration:** ~3 min
- **Started:** 2026-03-27T02:19:47Z
- **Completed:** 2026-03-27T02:22:00Z
- **Tasks:** 1 (TDD RED + GREEN commits)
- **Files modified:** 3

## Accomplishments

- Implemented `rewriteConfig` using magic-string that handles both `react()` (no args) and `react({ ssr: true })` (existing args) patterns
- Implemented `generateWarning` covering all 4 DetectionOutcome values with actionable human-readable messages
- Installed magic-string dependency and verified all 20 test assertions pass

## Task Commits

Each task was committed atomically (TDD: test first, then implementation):

1. **Task 1 RED: Config rewriting failing tests** - `4be4fea` (test)
2. **Task 1 GREEN: Config rewriting implementation** - `b5db0dd` (feat)

_Note: TDD tasks have multiple commits (test → feat)_

## Files Created/Modified

- `libs/create-qwikdev-astro/src/add-flow/rewrite-config.ts` - rewriteConfig and generateWarning implementations
- `libs/create-qwikdev-astro/src/add-flow/rewrite-config.test.ts` - 7 test cases, 20 assertions all passing
- `libs/create-qwikdev-astro/package.json` - Added magic-string dependency

## Decisions Made

- Used `prependRight` (not `overwrite`) for zero-argument calls like `react()` — magic-string throws on zero-length overwrite ranges
- Used `appendLeft` after the opening brace for existing-object-argument calls — inserts new property at the front preserving existing options
- `generateWarning` returns an empty string for `"none"` and `"safe"` outcomes (no message needed)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed zero-length overwrite error for empty-arg integration calls**
- **Found during:** Task 1 (first test run after implementing rewriteConfig)
- **Issue:** Used `ms.overwrite(pos, pos, ...)` for `react()` which has zero-length content between parens — magic-string throws on zero-length overwrites
- **Fix:** Changed to `ms.prependRight(closingParenPos, insertContent)` which correctly inserts before the closing paren
- **Files modified:** libs/create-qwikdev-astro/src/add-flow/rewrite-config.ts
- **Verification:** All 7 test cases pass including the empty-args case
- **Committed in:** b5db0dd (Task 1 GREEN commit)

---

**Total deviations:** 1 auto-fixed (Rule 1 - bug in initial implementation)
**Impact on plan:** Necessary correctness fix caught by tests. No scope creep.

## Issues Encountered

- magic-string's `overwrite()` requires a non-zero range — the empty-args case `react()` needed `prependRight` instead. Fixed inline during GREEN phase.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- `rewriteConfig` is ready for plan 02-03 (component scaffolding) and the final orchestration plan to consume
- `generateWarning` provides the full messaging layer for all outcomes
- All tests pass and provide regression coverage for the rewrite layer

## Self-Check: PASSED

All created files verified present. All task commits verified in git log.

---
*Phase: 02-multi-framework-add-flow*
*Completed: 2026-03-27*
