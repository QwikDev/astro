---
phase: quick
plan: 9
subsystem: upgrade-command
tags: [upgrade, npm-alias, ecosystem-compat, v1-compat]
dependency_graph:
  requires: []
  provides: ["@builder.io/qwik npm alias install", "ecosystem package warning in upgrade summary"]
  affects: ["libs/create-qwikdev-astro/src/upgrade.ts"]
tech_stack:
  added: []
  patterns: ["npm alias (pkg@npm:other-pkg@version)", "post-install version read from package.json"]
key_files:
  created: []
  modified:
    - libs/create-qwikdev-astro/src/upgrade.ts
decisions:
  - "Alias install reads @qwik.dev/core version from the post-install package.json (not hardcoded) so it always matches what was actually installed"
  - "Alias install failure warns and continues — partial install is safer than hard abort"
  - "Dry-run logs 'Would add alias' without reading or modifying any file"
metrics:
  duration: "< 5 minutes"
  completed: "2026-03-27T05:41:08Z"
  tasks: 1
  files_modified: 1
---

# Phase quick Plan 9: Add @builder.io/qwik npm alias to upgrade Summary

Add @builder.io/qwik npm alias install (pointing to @qwik.dev/core at the installed version) and ecosystem package update reminder to the upgrade script so v1 ecosystem libraries (qwik-ui, qwikest/icons) can resolve their peer deps without installing a duplicate v1 package.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Add @builder.io/qwik alias install and ecosystem warning | faa77f4 | libs/create-qwikdev-astro/src/upgrade.ts |

## What Was Built

Two additions to `libs/create-qwikdev-astro/src/upgrade.ts`:

**1. Alias install step (execute(), inside the real-run block after pm.add succeeds):**
- Reads updated package.json via `getPackageJson(input.absDir)` to get the actual installed `@qwik.dev/core` version
- Calls `pm.add(["@builder.io/qwik@npm:@qwik.dev/core@<version>"], { cwd: input.absDir })`
- Logs success with `this.info()`
- Wrapped in try/catch — `this.warn()` on failure, does NOT abort

**2. Dry-run logging:**
- After the "Would install" message, logs: `"Would add alias: @builder.io/qwik -> npm:@qwik.dev/core@<version>"`

**3. printSummary() Next steps ecosystem warning:**
- Appended: `Update ecosystem packages: @qwik-ui/headless, @qwikest/icons, etc. to latest versions`

## Deviations from Plan

None — plan executed exactly as written.

## Self-Check

- [x] `libs/create-qwikdev-astro/src/upgrade.ts` modified
- [x] TypeScript compilation passes (`npx tsc --noEmit` clean)
- [x] Commit faa77f4 exists
