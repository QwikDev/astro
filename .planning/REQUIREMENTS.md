# Requirements: @qwik.dev/create-astro CLI

**Defined:** 2026-03-26
**Core Value:** A single CLI that gets users from zero to a working Qwik + Astro project

## v1 Requirements

Requirements for the CLI upgrade command and multi-framework add-flow milestone.

### Upgrade Command

- [x] **UPG-01**: User can run `upgrade [directory]` to migrate a 0.x Qwik Astro project to 1.0
- [x] **UPG-02**: Preflight validates target is an Astro project with Qwik usage
- [x] **UPG-03**: Preflight warns on dirty Git working tree in interactive mode
- [x] **UPG-04**: Command delegates to `@astrojs/upgrade` via correct package manager
- [x] **UPG-05**: Command removes old packages and installs `@qwik.dev/astro@latest` + `@qwik.dev/core@latest`
- [x] **UPG-06**: Command rewrites `astro.config.*` imports from `@qwikdev/astro` to `@qwik.dev/astro`
- [x] **UPG-07**: Command rewrites `tsconfig` `jsxImportSource` from `@builder.io/qwik` to `@qwik.dev/core`
- [x] **UPG-08**: Command rewrites source file imports (`@builder.io/qwik` to `@qwik.dev/core`, `@qwikdev/astro` to `@qwik.dev/astro`)
- [x] **UPG-09**: Command rewrites `@jsxImportSource` pragma comments
- [x] **UPG-10**: Command warns on async `useComputed$` and `useResource$` patterns
- [x] **UPG-11**: Command prints summary report with changed files and docs link
- [x] **UPG-12**: `--dry-run` prints planned changes without writing
- [x] **UPG-13**: `--yes` accepts all safe defaults without prompts
- [x] **UPG-14**: `--no` declines optional actions but runs required steps

### Multi-Framework Detection

- [x] **MFD-01**: AST-based detection of React/Preact/Solid integrations in `astro.config.*` via oxc-parser
- [x] **MFD-02**: Source layout detection of framework file signals (imports, pragmas)
- [x] **MFD-03**: Detection returns structured `MultiFrameworkResult` with outcome/frameworks/notes/edits
- [x] **MFD-04**: Auto-configure adds `include` to Qwik and `exclude` to secondary integrations when safe
- [x] **MFD-05**: Config rewriting uses magic-string for targeted source edits preserving formatting
- [x] **MFD-06**: Warn-only fallback when auto-config is unsafe (files outside dedicated folder, dynamic exclude)
- [x] **MFD-07**: JSX import source prompt asks whether Qwik should be primary
- [x] **MFD-08**: Per-file `@jsxImportSource` pragma added to example component when Qwik is secondary
- [x] **MFD-09**: Example Qwik component scaffolded under `src/components/qwik/`

### Integration

- [ ] **INT-01**: Both commands wired into `src/app.ts` CLI entrypoint
- [ ] **INT-02**: `package.json` updated with `oxc-parser` and `magic-string` dependencies
- [ ] **INT-03**: `tests/cli.spec.ts` updated with CLI argument parsing tests for both commands

## v2 Requirements

Deferred to future release.

### Upgrade Enhancements

- **UPG-15**: `--to <version>` targeting for future migrations
- **UPG-16**: `--check` mode for upgrade status without applying changes
- **UPG-17**: Extended migration intelligence and diagnostics

## Out of Scope

| Feature | Reason |
|---------|--------|
| Qwik Router / Qwik City migration | Separate concern, not part of this CLI |
| Moving existing user files into framework folders | Too risky for v1, warn-only instead |
| React-to-Qwik component migration | Out of scope for CLI tooling |
| `@builder.io/qwik-react` migration | Router-specific, excluded by upgrade spec |
| Full AST-based source rewriting | String replacement sufficient for exact package specifiers |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| UPG-01 | Phase 1 | Complete |
| UPG-02 | Phase 1 | Complete |
| UPG-03 | Phase 1 | Complete |
| UPG-04 | Phase 1 | Complete |
| UPG-05 | Phase 1 | Complete |
| UPG-06 | Phase 1 | Complete |
| UPG-07 | Phase 1 | Complete |
| UPG-08 | Phase 1 | Complete |
| UPG-09 | Phase 1 | Complete |
| UPG-10 | Phase 1 | Complete |
| UPG-11 | Phase 1 | Complete |
| UPG-12 | Phase 1 | Complete |
| UPG-13 | Phase 1 | Complete |
| UPG-14 | Phase 1 | Complete |
| MFD-01 | Phase 2 | Complete |
| MFD-02 | Phase 2 | Complete |
| MFD-03 | Phase 2 | Complete |
| MFD-04 | Phase 2 | Complete |
| MFD-05 | Phase 2 | Complete |
| MFD-06 | Phase 2 | Complete |
| MFD-07 | Phase 2 | Complete |
| MFD-08 | Phase 2 | Complete |
| MFD-09 | Phase 2 | Complete |
| INT-01 | Phase 3 | Pending |
| INT-02 | Phase 3 | Pending |
| INT-03 | Phase 3 | Pending |

**Coverage:**
- v1 requirements: 26 total
- Mapped to phases: 26
- Unmapped: 0

---
*Requirements defined: 2026-03-26*
*Last updated: 2026-03-26 after roadmap creation*
