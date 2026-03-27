---
phase: quick-11
plan: 01
subsystem: cli
tags: [multi-framework, jsx-strategy, config-rewrite, scaffold]

requires:
  - phase: 02-multi-framework-add-flow
    provides: detectConfigFrameworks, rewriteConfig, scaffoldQwikComponent, determineJsxStrategy
  - phase: quick-10
    provides: isQwikRegistered duplicate prevention
provides:
  - Unified --add flag flow with multi-framework detection, JSX strategy, config rewriting, component scaffolding
affects: [create-qwikdev-astro, cli]

tech-stack:
  added: []
  patterns: [unified-add-flow, multi-framework-detection-in-app]

key-files:
  created:
    - libs/create-qwikdev-astro/tests/add-flow-unification.spec.ts
  modified:
    - libs/create-qwikdev-astro/src/app.ts

key-decisions:
  - "Fixture includes qwik() registration to skip astro add in test (avoids needing @astrojs/react installed)"
  - "persistTsconfigForAdd mirrors AddCommand.persistTsconfig but uses fs/path from app.ts scope"
  - "scanChoice defaults to 'primary' in non-interactive mode; intercept overrides in tests"

patterns-established:
  - "runAdd delegates to add-flow modules for multi-framework concerns"

requirements-completed: [QUICK-11]

duration: 5min
completed: 2026-03-27
---

# Quick Task 11: Unify --add and add Flows Summary

**--add flag flow now calls detectConfigFrameworks, prompts JSX strategy, rewrites config with exclude patterns, and scaffolds Counter.tsx with pragma**

## Performance

- **Duration:** 5 min
- **Started:** 2026-03-27T19:22:22Z
- **Completed:** 2026-03-27T19:27:01Z
- **Tasks:** 3
- **Files modified:** 2

## Accomplishments
- Unified Application.runAdd with AddCommand.execute multi-framework logic
- Added regression test proving --add on React+Astro project triggers framework detection
- All 120 tests pass with no regressions

## Task Commits

Each task was committed atomically:

1. **Task 1: Write failing regression test** - `6c234bb` (test)
2. **Task 2: Unify runAdd implementation** - `5eefd54` (feat)
3. **Task 3: Full test suite verification** - no commit (verification only)

## Files Created/Modified
- `libs/create-qwikdev-astro/tests/add-flow-unification.spec.ts` - Regression test proving --add invokes multi-framework detection
- `libs/create-qwikdev-astro/src/app.ts` - Unified runAdd with detectConfigFrameworks, rewriteConfig, scaffoldQwikComponent, persistTsconfigForAdd

## Decisions Made
- Fixture config includes both react() and qwik() in integrations so isQwikRegistered returns true and astro add is skipped during test (avoids needing @astrojs/react actually installed)
- Assert `react(` instead of `react()` since rewriteConfig transforms `react()` to `react({ exclude: [...] })`
- persistTsconfigForAdd uses simple JSON.parse (no JSONC stripping) since existing projects have valid JSON tsconfig

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed test fixture to include qwik registration**
- **Found during:** Task 1/2
- **Issue:** Test fixture with only react() in config caused astro add to fail (can't load @astrojs/react which isn't installed in test /tmp dir)
- **Fix:** Added qwik import and registration to fixture config so isQwikRegistered returns true, skipping astro add
- **Files modified:** libs/create-qwikdev-astro/tests/add-flow-unification.spec.ts
- **Verification:** Test passes, all assertions confirmed
- **Committed in:** 5eefd54 (Task 2 commit)

**2. [Rule 1 - Bug] Fixed react() assertion after config rewrite**
- **Found during:** Task 2
- **Issue:** Test asserted `react()` but rewriteConfig transforms it to `react({ exclude: ... })`
- **Fix:** Changed assertion to `react(` to match the rewritten form
- **Files modified:** libs/create-qwikdev-astro/tests/add-flow-unification.spec.ts
- **Verification:** Test passes
- **Committed in:** 5eefd54 (Task 2 commit)

---

**Total deviations:** 2 auto-fixed (2 bugs in test expectations)
**Impact on plan:** Both fixes necessary for test correctness. Core implementation matches plan exactly.

## Issues Encountered
None beyond the test fixture adjustments documented above.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- --add and add subcommand now share the same multi-framework detection pipeline
- Both paths handle React/Preact/Solid detection, JSX strategy prompting, config rewriting, and component scaffolding

---
*Quick Task: 11*
*Completed: 2026-03-27*
