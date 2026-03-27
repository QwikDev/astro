import { execSync } from "node:child_process";
import { getPackageJson } from "./utils";

export type ProjectValidationResult = {
  valid: boolean;
  reason?: string;
  hasOldQwik: boolean;
  hasNewQwik: boolean;
  hasAstro: boolean;
};

export type GitStatusResult = {
  isDirty: boolean;
  error?: string;
};

/**
 * Validates that the target directory is an Astro + Qwik project.
 * Checks package.json for required dependencies.
 */
export function validateProject(dir: string): ProjectValidationResult {
  let pkgJson: Record<string, any>;

  try {
    pkgJson = getPackageJson(dir);
  } catch {
    return {
      valid: false,
      reason: "No package.json found",
      hasOldQwik: false,
      hasNewQwik: false,
      hasAstro: false
    };
  }

  const deps: Record<string, string> = {
    ...(pkgJson.dependencies ?? {}),
    ...(pkgJson.devDependencies ?? {})
  };

  const hasAstro = "astro" in deps;
  const hasOldQwik = "@builder.io/qwik" in deps;
  const hasNewQwik = "@qwik.dev/core" in deps;
  const hasQwikAstroOld = "@qwikdev/astro" in deps;
  const hasQwikAstroNew = "@qwik.dev/astro" in deps;

  if (!hasAstro) {
    return {
      valid: false,
      reason: "Not an Astro project (astro not in dependencies)",
      hasOldQwik,
      hasNewQwik,
      hasAstro
    };
  }

  if (!(hasOldQwik || hasNewQwik || hasQwikAstroOld || hasQwikAstroNew)) {
    return {
      valid: false,
      reason: "No Qwik packages found",
      hasOldQwik,
      hasNewQwik,
      hasAstro
    };
  }

  return {
    valid: true,
    hasOldQwik,
    hasNewQwik,
    hasAstro
  };
}

/**
 * Checks if the git working tree in the target directory has uncommitted changes.
 * Returns isDirty: false if the directory is not a git repo (not a blocker).
 */
export async function checkGitStatus(dir: string): Promise<GitStatusResult> {
  try {
    const output = execSync("git status --porcelain", {
      cwd: dir,
      encoding: "utf8",
      stdio: ["pipe", "pipe", "pipe"]
    });

    return { isDirty: output.trim().length > 0 };
  } catch {
    // Not a git repo or git not available — not a blocker
    return { isDirty: false };
  }
}
