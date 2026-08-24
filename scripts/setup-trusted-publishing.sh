#!/usr/bin/env bash
#
# setup-trusted-publishing.sh
#
# Guided walkthrough for configuring npm Trusted Publishing (OIDC) for the
# packages released by .github/workflows/manual-release.yml.
#
# IMPORTANT: npm exposes no CLI or public API for trusted-publisher
# configuration. Every step that changes npm settings is web-UI-only and must
# be performed by you on npmjs.com. This script never publishes anything and
# never changes npm settings on your behalf; it prints the exact values to
# enter, runs a few read-only preflight checks, and (optionally, behind an
# explicit prompt) deletes the now-unused NPM_TOKEN GitHub secret for you.

set -euo pipefail

REPO_OWNER="QwikDev"
REPO_NAME="astro"
REPO_SLUG="QwikDev/astro"
WORKFLOW_FILE="manual-release.yml"
PACKAGES="@qwik.dev/astro @qwik.dev/create-astro"

# ---------------------------------------------------------------------------
# Output helpers (colour only when stdout is a terminal).
# ---------------------------------------------------------------------------

if [ -t 1 ]; then
  BOLD="$(printf '\033[1m')"
  DIM="$(printf '\033[2m')"
  RESET="$(printf '\033[0m')"
else
  BOLD=""
  DIM=""
  RESET=""
fi

heading() {
  printf '\n%s==> %s%s\n' "$BOLD" "$1" "$RESET"
}

note() {
  printf '%s    %s%s\n' "$DIM" "$1" "$RESET"
}

line() {
  printf '    %s\n' "$1"
}

blank() {
  printf '\n'
}

# ---------------------------------------------------------------------------
# 0. Intro
# ---------------------------------------------------------------------------

heading "npm Trusted Publishing setup for $REPO_SLUG"
line "The Manual Release workflow releases with OIDC instead of a long-lived"
line "npm token. For that to work, each package must trust this repository's"
line "release workflow as a publisher."
blank
line "Steps 1 and 2 below are WEB-UI-ONLY: npm has no CLI or API for trusted"
line "publisher configuration, so this script can only tell you what to enter."

# ---------------------------------------------------------------------------
# 1. Optional, non-mutating preflight checks.
# ---------------------------------------------------------------------------

heading "Preflight (read-only, safe to skip)"

if command -v npm >/dev/null 2>&1; then
  npm_user=""
  if npm_user="$(npm whoami 2>/dev/null)" && [ -n "$npm_user" ]; then
    line "npm login: logged in as '$npm_user'"
    note "Make sure this account can administer both packages on npmjs.com."
  else
    line "npm login: not logged in (or 'npm whoami' failed)"
    note "Not required for this script, but you must be signed in on"
    note "npmjs.com in your browser to complete steps 1 and 2."
  fi

  for pkg in $PACKAGES; do
    pkg_version=""
    if pkg_version="$(npm view "$pkg" version 2>/dev/null)" && [ -n "$pkg_version" ]; then
      line "$pkg: currently published at $pkg_version"
    else
      line "$pkg: could not read a published version"
      note "The package may not exist yet, or the registry lookup failed."
      note "A trusted publisher can only be configured on an existing package."
    fi
  done
else
  line "npm was not found on PATH - skipping preflight checks."
  note "The preflight is informational only; the web steps below still apply."
fi

# ---------------------------------------------------------------------------
# 2. Per-package web-UI walkthrough.
# ---------------------------------------------------------------------------

heading "Configure the trusted publisher for each package (web UI only)"
line "For EACH package below: open the URL, scroll to 'Trusted Publisher',"
line "choose GitHub Actions, and enter exactly these values."

for pkg in $PACKAGES; do
  blank
  printf '  %s%s%s\n' "$BOLD" "$pkg" "$RESET"
  line "URL:                   https://www.npmjs.com/package/$pkg/access"
  line "Publisher:             GitHub Actions"
  line "Organization or user:  $REPO_OWNER"
  line "Repository:            $REPO_NAME"
  line "Workflow filename:     $WORKFLOW_FILE"
  line "Environment:           (leave blank)"
done

blank
note "The workflow filename is just the file name, not a path -"
note "'$WORKFLOW_FILE', not '.github/workflows/$WORKFLOW_FILE'."
note "Leave the environment field empty; the release job does not use a"
note "GitHub deployment environment."

# ---------------------------------------------------------------------------
# 3. After-configuration checklist.
# ---------------------------------------------------------------------------

heading "After both packages are configured"
line "1. Dispatch the 'Manual Release' workflow with version=minor for the"
line "   FIRST release. The minor bump supersedes the deleted pending"
line "   changeset (@qwik.dev/astro minor, @qwik.dev/create-astro patch)."
line "   https://github.com/$REPO_SLUG/actions/workflows/$WORKFLOW_FILE"
blank
line "2. Delete the now-unused NPM_TOKEN repository secret. Trusted"
line "   publishing replaces it, so leaving it around is dead credential"
line "   surface."

# ---------------------------------------------------------------------------
# 4. Optional NPM_TOKEN secret deletion (gh-gated, explicit y/N).
# ---------------------------------------------------------------------------

manual_secret_instructions() {
  blank
  line "Delete NPM_TOKEN manually:"
  line "  GitHub -> https://github.com/$REPO_SLUG"
  line "  Settings -> Secrets and variables -> Actions"
  line "  -> Repository secrets -> NPM_TOKEN -> Delete"
}

heading "Optional: delete the NPM_TOKEN secret now"

if ! command -v gh >/dev/null 2>&1; then
  line "The GitHub CLI ('gh') was not found on PATH, so this script cannot"
  line "delete the secret for you."
  manual_secret_instructions
elif [ ! -t 0 ]; then
  line "Not running interactively - skipping the deletion prompt."
  manual_secret_instructions
else
  line "This is the only step in this script that changes anything."
  line "Only do it AFTER both packages are configured above and you are"
  line "confident the trusted-publisher release works."
  blank
  printf '    Run: gh secret delete NPM_TOKEN --repo %s ? [y/N] ' "$REPO_SLUG"
  answer=""
  read -r answer || answer=""
  case "$answer" in
    y | Y)
      if gh secret delete NPM_TOKEN --repo "$REPO_SLUG"; then
        line "NPM_TOKEN deleted."
      else
        line "Deleting NPM_TOKEN failed (it may already be gone, or your"
        line "'gh' account may lack admin rights on the repository)."
        manual_secret_instructions
      fi
      ;;
    *)
      line "Skipped - NPM_TOKEN was left untouched."
      manual_secret_instructions
      ;;
  esac
fi

heading "Done"
line "This script published nothing and changed no npm settings."
blank
