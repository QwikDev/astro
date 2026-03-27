import MagicString from "magic-string";
import type { MultiFrameworkResult } from "./types.js";

/**
 * Rewrite an astro.config source string by applying ConfigEdits from a MultiFrameworkResult.
 *
 * Uses magic-string for character-position-based edits so that whitespace, comments,
 * and trailing commas outside the edit regions are preserved byte-for-byte.
 *
 * @param source - The original astro.config source string
 * @param result - Detection result with edits to apply
 * @returns The rewritten source string, or null if outcome is not "safe"
 */
export function rewriteConfig(
  source: string,
  result: MultiFrameworkResult
): string | null {
  if (result.outcome !== "safe") {
    return null;
  }

  const ms = new MagicString(source);

  for (const edit of result.edits) {
    // edit.span covers the full call expression, e.g. `react()` or `react({ ssr: true })`
    const callText = source.slice(edit.span.start, edit.span.end);
    const propName = edit.type === "add-include" ? "include" : "exclude";

    // Match the call: functionName(...args...)
    // We look for the opening paren and parse from there
    const openParenIdx = callText.indexOf("(");
    if (openParenIdx === -1) continue;

    const innerContent = callText.slice(openParenIdx + 1, -1).trim();
    if (innerContent === "") {
      // No arguments: react() → react({ include: [...] })
      // The parens are empty, so start === end — use appendLeft on the closing paren position
      const insertContent = `{ ${propName}: ${edit.value} }`;
      ms.prependRight(edit.span.end - 1, insertContent);
    } else if (innerContent.startsWith("{") && innerContent.endsWith("}")) {
      // Object argument: react({ ssr: true }) → react({ include: [...], ssr: true })
      // We want to insert the new property right after the opening brace.
      // Find the position of the opening brace inside the call text.
      const braceRelIdx = callText.indexOf("{", openParenIdx + 1);
      const absoluteBraceOpen = edit.span.start + braceRelIdx;

      // Check if the object has any existing properties
      const existingInner = innerContent.slice(1, -1).trim();
      if (existingInner === "") {
        // Empty object: react({}) → react({ include: [...] })
        ms.overwrite(absoluteBraceOpen + 1, edit.span.end - 2, ` ${propName}: ${edit.value} `);
      } else {
        // Has properties: insert new property + comma at start
        // Find the exact position after the opening brace in the source
        ms.appendLeft(absoluteBraceOpen + 1, ` ${propName}: ${edit.value},`);
      }
    }
    // else: unknown format — skip this edit
  }

  return ms.toString();
}

/**
 * Generate a human-readable warning message for non-safe MultiFrameworkResult outcomes.
 *
 * @param result - Detection result with outcome and framework info
 * @returns A warning string, or empty string for "none" outcome
 */
export function generateWarning(result: MultiFrameworkResult): string {
  switch (result.outcome) {
    case "unsafe": {
      const frameworkNames =
        result.frameworks.length > 0
          ? result.frameworks.map((f) => f.name).join(", ")
          : "the detected frameworks";

      const notes = result.notes.length > 0 ? result.notes.join(" ") : "";

      return [
        "Warning: Could not automatically configure multi-framework support.",
        "",
        notes
          ? notes
          : "The integrations array contains spread elements, which cannot be statically analyzed.",
        "",
        `Please configure ${frameworkNames} manually by adding include/exclude options:`,
        "",
        "  // For each non-Qwik framework, add an include pattern:",
        "  react({ include: ['src/components/react/**/*'] })",
        "",
        "  // For Qwik, add the corresponding exclude pattern:",
        "  qwik({ exclude: ['src/components/react/**/*'] })"
      ].join("\n");
    }

    case "already-configured": {
      const frameworkNames =
        result.frameworks.length > 0
          ? result.frameworks.map((f) => f.name).join(", ")
          : "your integrations";

      return `Your config already has include/exclude options set for ${frameworkNames}. No changes needed.`;
    }

    case "none":
      return "";

    case "safe":
      return "";

    default:
      return "";
  }
}
