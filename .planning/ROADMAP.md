# Roadmap: @qwik.dev/create-astro CLI

## Overview

This milestone ships two parallel workstreams — the upgrade command (0.x to 1.0 migration) and multi-framework add-flow (React/Preact/Solid coexistence) — then wires them into a unified CLI entrypoint. Phases 1 and 2 have non-overlapping file ownership and can execute concurrently. Phase 3 depends on both completing first.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [x] **Phase 1: Upgrade Command** - Implement `upgrade [directory]` for 0.x to 1.0 migration in `src/upgrade*` (completed 2026-03-27)
- [ ] **Phase 2: Multi-Framework Add-Flow** - Implement AST-based framework detection and safe config rewriting in `src/add*`
- [ ] **Phase 3: Integration** - Wire both commands into shared entrypoint, add dependencies, and add tests

## Phase Details

### Phase 1: Upgrade Command
**Goal**: Users can run `upgrade [directory]` to fully migrate a 0.x Qwik + Astro project to the 1.0 package namespace
**Depends on**: Nothing (first phase, parallel with Phase 2)
**Requirements**: UPG-01, UPG-02, UPG-03, UPG-04, UPG-05, UPG-06, UPG-07, UPG-08, UPG-09, UPG-10, UPG-11, UPG-12, UPG-13, UPG-14
**Success Criteria** (what must be TRUE):
  1. User runs `upgrade ./my-project` and the command validates the directory is a Qwik Astro project before making any changes
  2. User sees a warning when the Git working tree is dirty and can choose to continue or abort
  3. After running upgrade, all `@builder.io/qwik` and `@qwikdev/astro` references in source files, tsconfig, and astro.config are rewritten to the new package names
  4. User runs with `--dry-run` and sees a report of all planned changes without any files being modified
  5. User sees a final summary report listing all changed files and a link to migration docs
**Plans**: 3 plans

Plans:
- [ ] 01-01-PLAN.md — Types, preflight validation, and UpgradeCommand skeleton
- [ ] 01-02-PLAN.md — Core migration pipeline: @astrojs/upgrade, package swap, source rewriting
- [ ] 01-03-PLAN.md — Dry-run report and summary output

### Phase 2: Multi-Framework Add-Flow
**Goal**: Users adding Qwik to a project with React, Preact, or Solid already present get automatic safe configuration of JSX boundaries without breaking existing framework components
**Depends on**: Nothing (first phase, parallel with Phase 1)
**Requirements**: MFD-01, MFD-02, MFD-03, MFD-04, MFD-05, MFD-06, MFD-07, MFD-08, MFD-09
**Success Criteria** (what must be TRUE):
  1. User adding Qwik to a React project gets `include`/`exclude` folder boundaries automatically configured in astro.config using AST-based editing that preserves original formatting
  2. User is warned (not broken) when auto-config is unsafe, with a clear explanation of what manual steps are needed
  3. User is prompted whether Qwik should be the primary JSX source or secondary, and the config reflects that choice
  4. A scaffolded `src/components/qwik/` example component exists with correct `@jsxImportSource` pragma when Qwik is secondary
**Plans**: 3 plans

Plans:
- [ ] 02-01-PLAN.md — Types, AST-based config detection, and source layout detection
- [ ] 02-02-PLAN.md — Config rewriting with magic-string and safety warnings
- [ ] 02-03-PLAN.md — JSX strategy prompt logic and component scaffolding

### Phase 3: Integration
**Goal**: Both commands are reachable through the CLI entrypoint, new dependencies are declared, and CLI argument parsing is verified by tests
**Depends on**: Phase 1, Phase 2
**Requirements**: INT-01, INT-02, INT-03
**Success Criteria** (what must be TRUE):
  1. User runs `create-qwikdev-astro upgrade` and `create-qwikdev-astro add` from the CLI without errors
  2. `oxc-parser` and `magic-string` are listed in package.json dependencies and resolve correctly at runtime
  3. CLI argument parsing tests for both commands pass in the test suite
**Plans**: TBD

## Progress

**Execution Order:**
Phases 1 and 2 execute in parallel. Phase 3 follows both.

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Upgrade Command | 3/3 | Complete   | 2026-03-27 |
| 2. Multi-Framework Add-Flow | 0/3 | Planned | - |
| 3. Integration | 0/TBD | Not started | - |
