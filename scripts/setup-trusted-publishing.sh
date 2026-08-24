#!/usr/bin/env bash
#
# setup-trusted-publishing.sh
#
# Configure npm Trusted Publishing (OIDC) for the packages released by
# .github/workflows/manual-release.yml.
#
#   scripts/setup-trusted-publishing.sh           # attach the trusted publishers
#   scripts/setup-trusted-publishing.sh --check   # report current state, change nothing
#
# npm 11.15.0 and newer can attach a trusted publisher from the CLI, so on a
# recent npm this script does the whole job. Older npm ships a 'npm trust' that
# sends a payload the registry rejects with a bare 400 ("value must be an
# array"), once per package and with no hint that the CLI is at fault, so this
# script refuses to use it and falls back to the web-UI walkthrough instead.
#
# The attach path writes to the registry and needs 2FA: npm prints a browser
# URL for you to open, and that window is about five minutes - long enough for
# both packages. Its output is deliberately not swallowed, because hiding the
# prompt turns 2FA into a silent hang.
#
# Nothing else here mutates anything, apart from the optional NPM_TOKEN secret
# deletion at the very end, which is behind an explicit y/N prompt.

set -euo pipefail

REPO_OWNER="QwikDev"
REPO_NAME="astro"
REPO_SLUG="QwikDev/astro"
WORKFLOW_FILE="manual-release.yml"
PACKAGES="@qwik.dev/astro @qwik.dev/create-astro"

# The oldest npm whose 'npm trust' speaks the payload the registry accepts.
NPM_TRUST_MIN="11.15.0"

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

package_heading() {
  printf '\n  %s%s%s\n' "$BOLD" "$1" "$RESET"
}

usage() {
  printf 'Usage: %s [--check]\n\n' "$0"
  printf '  (no flags)  attach the GitHub Actions trusted publisher to each package\n'
  printf '  --check     report the current trusted publishers and exit\n'
  printf '  --help      show this message\n'
}

# ---------------------------------------------------------------------------
# Argument parsing.
# ---------------------------------------------------------------------------

MODE="attach"

for arg in "$@"; do
  case "$arg" in
    --check)
      MODE="check"
      ;;
    -h | --help)
      usage
      exit 0
      ;;
    *)
      printf 'unknown argument: %s\n\n' "$arg" >&2
      usage >&2
      exit 2
      ;;
  esac
done

# ---------------------------------------------------------------------------
# Version comparison (bash 3.2 safe, no external tools).
# ---------------------------------------------------------------------------

# version_ge HAVE WANT -> 0 when HAVE >= WANT. Non-numeric input counts as
# "not new enough", which is the safe direction for a registry write.
version_ge() {
  local have want old_ifs
  local h1 h2 h3 w1 w2 w3

  have="${1%%-*}"
  want="${2%%-*}"
  old_ifs="$IFS"

  IFS='.'
  # shellcheck disable=SC2086 # deliberate split on '.'
  set -- $have
  IFS="$old_ifs"
  h1="${1:-0}"
  h2="${2:-0}"
  h3="${3:-0}"

  IFS='.'
  # shellcheck disable=SC2086 # deliberate split on '.'
  set -- $want
  IFS="$old_ifs"
  w1="${1:-0}"
  w2="${2:-0}"
  w3="${3:-0}"

  case "$h1$h2$h3$w1$w2$w3" in
    '' | *[!0-9]*) return 1 ;;
  esac

  if [ "$h1" -gt "$w1" ]; then return 0; fi
  if [ "$h1" -lt "$w1" ]; then return 1; fi
  if [ "$h2" -gt "$w2" ]; then return 0; fi
  if [ "$h2" -lt "$w2" ]; then return 1; fi
  if [ "$h3" -ge "$w3" ]; then return 0; fi
  return 1
}

# ---------------------------------------------------------------------------
# Web-UI walkthrough - the fallback whenever the CLI path is unavailable, and
# the manual recovery path when a CLI attach fails.
# ---------------------------------------------------------------------------

web_ui_walkthrough() {
  local pkg
  heading "Configure the trusted publisher for each package (web UI)"
  line "For EACH package below: open the URL, scroll to 'Trusted Publisher',"
  line "choose GitHub Actions, and enter exactly these values."

  for pkg in $PACKAGES; do
    package_heading "$pkg"
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
}

# ---------------------------------------------------------------------------
# 0. Intro
# ---------------------------------------------------------------------------

heading "npm Trusted Publishing setup for $REPO_SLUG"
line "The Manual Release workflow releases with OIDC instead of a long-lived"
line "npm token. For that to work, each package must trust this repository's"
line "release workflow as a publisher."
if [ "$MODE" = "check" ]; then
  blank
  line "Running in --check mode: this reports state and changes nothing."
fi

# ---------------------------------------------------------------------------
# 1. Preflight (read-only). Decides whether the CLI path is usable.
# ---------------------------------------------------------------------------

heading "Preflight (read-only)"

TRUST_CLI=0
TRUST_BLOCKER=""
TRUST_FIX=""

if command -v npm >/dev/null 2>&1; then
  npm_version=""
  npm_version="$(npm --version 2>/dev/null || true)"
  if [ -n "$npm_version" ]; then
    line "npm version: $npm_version"
  else
    line "npm version: could not be determined"
  fi

  npm_user=""
  if npm_user="$(npm whoami 2>/dev/null)" && [ -n "$npm_user" ]; then
    line "npm login: logged in as '$npm_user'"
    note "This account must be able to administer both packages."
  else
    line "npm login: not logged in (or 'npm whoami' failed)"
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

  if [ -z "$npm_user" ]; then
    TRUST_BLOCKER="not logged in to npm"
    TRUST_FIX="npm login"
  elif ! version_ge "$npm_version" "$NPM_TRUST_MIN"; then
    TRUST_BLOCKER="npm ${npm_version:-<unknown>} is too old for 'npm trust' (needs >= $NPM_TRUST_MIN)"
    TRUST_FIX="npm install -g npm@latest"
  else
    TRUST_CLI=1
  fi
else
  line "npm was not found on PATH."
  TRUST_BLOCKER="npm is not on PATH"
  TRUST_FIX="install Node.js and npm >= $NPM_TRUST_MIN"
fi

if [ "$TRUST_CLI" -eq 1 ]; then
  line "'npm trust' is usable - this script can configure the packages directly."
else
  blank
  line "Cannot use the 'npm trust' CLI: $TRUST_BLOCKER"
  line "Fix it with:  $TRUST_FIX"
  note "Older 'npm trust' does exist, but the registry rejects its payload with"
  note "a bare 400 ('value must be an array') per package and no hint that the"
  note "CLI is at fault, so this script will not call it."
fi

# ---------------------------------------------------------------------------
# 2. --check: report current state and stop.
# ---------------------------------------------------------------------------

if [ "$MODE" = "check" ]; then
  if [ "$TRUST_CLI" -eq 1 ]; then
    heading "Current trusted publishers"
    for pkg in $PACKAGES; do
      package_heading "$pkg"
      if ! npm view "$pkg" version >/dev/null 2>&1; then
        line "not published yet - nothing to report"
        continue
      fi
      trust_out=""
      trust_out="$(npm trust list "$pkg" 2>&1 || true)"
      if [ -n "$trust_out" ]; then
        printf '%s\n' "$trust_out" | sed 's/^/    /'
      else
        line "(no output from 'npm trust list')"
      fi
    done
  else
    heading "Current trusted publishers"
    line "Reading the current state needs 'npm trust list', which is not"
    line "available here. Check each package in the web UI instead:"
    for pkg in $PACKAGES; do
      line "  https://www.npmjs.com/package/$pkg/access"
    done
  fi

  heading "Done"
  line "--check changed nothing."
  blank
  exit 0
fi

# ---------------------------------------------------------------------------
# 3. Attach the trusted publishers.
# ---------------------------------------------------------------------------

attach_ok=0
attach_skipped=0
attach_failed=0

if [ "$TRUST_CLI" -eq 1 ]; then
  heading "Attaching the trusted publisher to each package"
  line "npm asks for 2FA and prints a browser URL - open it when it appears."
  line "The 2FA window is about five minutes, long enough for both packages."
  blank
  note "Any existing trusted publisher is revoked first: npm refuses to"
  note "overwrite one (E409 'already exists ... delete and re-create')."

  for pkg in $PACKAGES; do
    package_heading "$pkg"

    if ! npm view "$pkg" version >/dev/null 2>&1; then
      line "not published yet - skipping"
      note "A trusted publisher can only be attached to an existing package."
      attach_skipped=$((attach_skipped + 1))
      continue
    fi

    # 'npm trust list' prints the trust id as a UUID; revoke every one found so
    # the create below is not refused as a duplicate. This is also what makes a
    # re-point (say, after a repository transfer) work.
    existing_ids=""
    existing_ids="$(npm trust list "$pkg" 2>/dev/null |
      grep -oE '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}' |
      sort -u || true)"

    revoke_failed=0
    for trust_id in $existing_ids; do
      line "revoking existing trusted publisher $trust_id"
      if npm trust revoke "$pkg" --id="$trust_id"; then
        # npm rate limits bursts of registry writes.
        sleep 2
      else
        line "FAILED to revoke $trust_id - not attempting to attach a new one"
        revoke_failed=1
        break
      fi
    done

    if [ "$revoke_failed" -eq 1 ]; then
      attach_failed=$((attach_failed + 1))
      continue
    fi

    if npm trust github "$pkg" \
      --repo "$REPO_SLUG" \
      --file "$WORKFLOW_FILE" \
      --allow-publish \
      --yes; then
      line "trusted: $REPO_SLUG -> $WORKFLOW_FILE"
      attach_ok=$((attach_ok + 1))
    else
      line "FAILED - see the npm output above"
      attach_failed=$((attach_failed + 1))
    fi

    sleep 2
  done

  heading "Summary"
  line "trusted $attach_ok, skipped $attach_skipped, failed $attach_failed"

  if [ "$attach_failed" -ne 0 ] || [ "$attach_skipped" -ne 0 ]; then
    blank
    line "Some packages were not configured. Finish them by hand:"
    web_ui_walkthrough
  fi
else
  line "Falling back to the web-UI walkthrough."
  web_ui_walkthrough
fi

# ---------------------------------------------------------------------------
# 4. After-configuration checklist.
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
# 5. Optional NPM_TOKEN secret deletion (gh-gated, explicit y/N).
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
  line "Only do this AFTER both packages are configured above and you are"
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
if [ "$attach_failed" -ne 0 ]; then
  line "$attach_failed package(s) could not be configured from the CLI."
  blank
  exit 1
fi
line "This script released nothing."
blank
