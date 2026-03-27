---
phase: 02-multi-framework-add-flow
plan: "03"
subsystem: cli
tags: [jsx, scaffold, component-template, tdd, typescript]

requires:
  - phase: 02-multi-framework-add-flow
    plan: "01"
    provides: "types.ts with FrameworkInfo, MultiFrameworkResult, SourceSignal contracts"

provides:
  - "JsxStrategy type: qwikIsPrimary, pragma, tsconfigSource fields"
  - "determineJsxStrategy: pure function mapping primary/secondary to JsxStrategy"
  - "scaffoldQwikComponent: reads Counter.tsx template and conditionally prepends @jsxImportSource pragma"
  - "Counter.tsx template: minimal Qwik counter using component$ and useSignal from @qwik.dev/core"

affects:
  - 02-multi-framework-add-flow

tech-stack:
  added: []
  patterns:
    - "TDD: failing test committed before implementation"
    - "Template-based scaffolding: template file has no pragma; pragma conditionally prepended at scaffold time"
    - "Pure logic module: determineJsxStrategy takes resolved choice, no interactive I/O (wiring to CLI prompt deferred to Phase 3)"

key-files:
  created:
    - libs/create-qwikdev-astro/stubs/templates/qwik-component/Counter.tsx
    - libs/create-qwikdev-astro/src/add-flow/jsx-strategy.ts
    - libs/create-qwikdev-astro/src/add-flow/scaffold.ts
    - libs/create-qwikdev-astro/src/add-flow/jsx-strategy.test.ts
  modified: []

key-decisions:
  - "Template file has no pragma — pragma is prepended at scaffold time based on strategy choice"
  - "determineJsxStrategy is pure logic with no I/O — interactive prompt wiring deferred to Phase 3 CLI integration"
  - "scaffoldQwikComponent reads template via __dirname relative path (same pattern as app.ts)"

patterns-established:
  - "add-flow scaffold modules follow same __dirname resolution pattern as app.ts for template paths"
  - "JsxStrategy.pragma=null means primary (no per-file pragma needed); pragma string means secondary"

requirements-completed: [MFD-07, MFD-08, MFD-09]

duration: 3min
completed: 2026-03-27
---

# Phase 02 Plan 03: JSX Strategy and Component Scaffolding Summary

**JSX import source strategy module and Qwik counter component scaffolding with conditional @jsxImportSource pragma based on primary/secondary framework choice**

## Performance

- **Duration:** ~3 min
- **Started:** 2026-03-27T02:20:02Z
- **Completed:** 2026-03-27T02:23:00Z
- **Tasks:** 2 (Task 2 with TDD RED + GREEN commits)
- **Files modified:** 4

## Accomplishments

- Created `Counter.tsx` template as a minimal Qwik counter component (no pragma in the file itself)
- Implemented `determineJsxStrategy` as a pure function mapping "primary"/"secondary" to a typed `JsxStrategy` object
- Implemented `scaffoldQwikComponent` that reads the Counter.tsx template and conditionally prepends the `@jsxImportSource` pragma based on the strategy

## Task Commits

Each task was committed atomically (TDD: test first, then implementation):

1. **Task 1: Create example Qwik counter component template** - `4ed96c8` (chore)
2. **Task 2 RED: Failing tests for JSX strategy and scaffolding** - `291e2e4` (test)
3. **Task 2 GREEN: JSX strategy and scaffold implementation** - `37fac01` (feat)

_Note: TDD tasks have multiple commits (test → feat)_

## Files Created/Modified

- `libs/create-qwikdev-astro/stubs/templates/qwik-component/Counter.tsx` - Qwik counter template, no pragma (pragma added at scaffold time)
- `libs/create-qwikdev-astro/src/add-flow/jsx-strategy.ts` - `JsxStrategy` type + `determineJsxStrategy` pure function
- `libs/create-qwikdev-astro/src/add-flow/scaffold.ts` - `scaffoldQwikComponent` with conditional pragma prepend
- `libs/create-qwikdev-astro/src/add-flow/jsx-strategy.test.ts` - 5 test cases, all passing

## Decisions Made

- The `determineJsxStrategy` function is pure logic — it takes the user's choice as input and returns the strategy. No interactive prompt logic here; that wiring is deferred to Phase 3 when integrating into the full CLI add flow.
- The template file intentionally has no pragma. This keeps the template clean and readable; the scaffold module prepends it dynamically, making the intent explicit.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- `JsxStrategy` type and `determineJsxStrategy` are ready for Phase 3 CLI wiring
- `scaffoldQwikComponent` is ready to be called from the add-flow orchestrator
- All tests pass and provide regression coverage for the strategy/scaffold layer

## Self-Check: PASSED

All created files verified present. All task commits verified in git log.

---
*Phase: 02-multi-framework-add-flow*
*Completed: 2026-03-27*
