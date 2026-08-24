import { parseSync } from "oxc-parser";
import type { ConfigEdit, FrameworkInfo, MultiFrameworkResult } from "./types.js";

/** Recognized framework integrations and their package names */
const KNOWN_FRAMEWORKS: Record<string, FrameworkInfo["name"]> = {
  "@astrojs/react": "react",
  "@astrojs/preact": "preact",
  "@astrojs/solid-js": "solid"
};

/** AST node types used for walking */
type ASTNode = Record<string, unknown>;

/**
 * Check whether the config source contains any import from `@qwik.dev/astro`.
 * This is intentionally a broad check — if the import exists, we must ensure
 * the package is installed before `astro add` tries to load the config,
 * regardless of whether the integration is fully registered.
 */
export function hasQwikImport(configSource: string): boolean {
  const parsed = parseSync("astro.config.ts", configSource, {
    sourceType: "module"
  });

  for (const node of parsed.program?.body ?? []) {
    const n = node as unknown as ASTNode;
    if (n.type !== "ImportDeclaration") continue;
    const source = n.source as ASTNode | undefined;
    if ((source?.value as string) === "@qwik.dev/astro") return true;
  }

  return false;
}

/**
 * Check whether the config source has qwik() registered in the integrations array.
 * This is a more precise check than hasQwikImport — it confirms the integration is
 * actually wired up, not just imported.
 *
 * Conservative: only returns true when inline `export default defineConfig({...})`
 * with a literal array integrations is detected. Variable-exported and callback
 * configs return false (safe fallback — astro add will run).
 *
 * False negatives are safe. False positives would incorrectly skip astro add.
 */
export function isQwikRegistered(configSource: string): boolean {
  const parsed = parseSync("astro.config.ts", configSource, {
    sourceType: "module"
  });

  const body = parsed.program?.body ?? [];

  // Step 1: Collect import bindings from @qwik.dev/astro
  // e.g., `import qwik from "@qwik.dev/astro"` -> binding "qwik"
  const qwikBindings = new Set<string>();

  for (const node of body) {
    const n = node as unknown as ASTNode;
    if (n.type !== "ImportDeclaration") continue;
    const source = n.source as ASTNode | undefined;
    if ((source?.value as string) !== "@qwik.dev/astro") continue;
    const specifiers = (n.specifiers as ASTNode[]) ?? [];
    for (const spec of specifiers) {
      if (spec.type === "ImportDefaultSpecifier") {
        const local = spec.local as ASTNode;
        qwikBindings.add(local.name as string);
      }
    }
  }

  if (qwikBindings.size === 0) return false;

  // Step 2: Find the integrations array from inline default export
  // Handles:
  //   export default { integrations: [qwik()] }
  //   export default defineConfig({ integrations: [qwik()] })
  // Does NOT handle variable or callback patterns (returns false — safe fallback)
  let integrationsArray: ASTNode | null = null;

  for (const node of body) {
    const n = node as unknown as ASTNode;
    if (n.type !== "ExportDefaultDeclaration") continue;

    const decl = n.declaration as ASTNode;
    let configObject: ASTNode | null = null;

    if (decl.type === "ObjectExpression") {
      configObject = decl;
    } else if (decl.type === "CallExpression") {
      const args = (decl.arguments as ASTNode[]) ?? [];
      // Only handle the inline object case — NOT callback () => ({...})
      if (args[0]?.type === "ObjectExpression") {
        configObject = args[0];
      }
    }

    if (!configObject) break; // variable/callback pattern — safe fallback

    const props = (configObject.properties as ASTNode[]) ?? [];
    for (const prop of props) {
      const key = prop.key as ASTNode;
      if (key.name === "integrations" || key.value === "integrations") {
        integrationsArray = prop.value as ASTNode;
        break;
      }
    }

    break;
  }

  if (!integrationsArray || integrationsArray.type !== "ArrayExpression") return false;

  // Step 3: Check if any call in the array uses a qwik binding
  const elements = (integrationsArray.elements as ASTNode[]) ?? [];
  for (const el of elements) {
    if (!el || el.type !== "CallExpression") continue;
    const callee = el.callee as ASTNode;
    if (callee.type === "Identifier" && qwikBindings.has(callee.name as string)) {
      return true;
    }
  }

  return false;
}

/**
 * Detect React, Preact, and Solid integrations in an astro.config source string.
 * Uses oxc-parser for AST-based analysis.
 */
export function detectConfigFrameworks(configSource: string): MultiFrameworkResult {
  const notes: string[] = [];
  const edits: ConfigEdit[] = [];
  const frameworks: FrameworkInfo[] = [];

  // Parse the config source as an ESM module
  const parsed = parseSync("astro.config.ts", configSource, {
    sourceType: "module"
  });

  const body = parsed.program?.body ?? [];

  // Step 1: Map import bindings to their source packages
  // e.g., `import react from '@astrojs/react'` -> binding "react" => "@astrojs/react"
  const bindingToPackage = new Map<string, string>();

  for (const node of body) {
    const n = node as unknown as ASTNode;
    if (n.type !== "ImportDeclaration") continue;
    const source = n.source as ASTNode | undefined;
    const packageName = source?.value as string | undefined;
    if (!(packageName && KNOWN_FRAMEWORKS[packageName])) continue;
    const specifiers = (n.specifiers as ASTNode[]) ?? [];
    for (const spec of specifiers) {
      if (spec.type === "ImportDefaultSpecifier") {
        const local = spec.local as ASTNode;
        bindingToPackage.set(local.name as string, packageName);
      }
    }
  }

  // Step 2: Find the default export object and its `integrations` array
  let integrationsArray: ASTNode | null = null;

  for (const node of body) {
    const n = node as unknown as ASTNode;
    if (n.type !== "ExportDefaultDeclaration") continue;

    const decl = n.declaration as ASTNode;
    // Could be an object literal or a call expression (e.g., defineConfig({...}))
    let configObject: ASTNode | null = null;

    if (decl.type === "ObjectExpression") {
      configObject = decl;
    } else if (decl.type === "CallExpression") {
      // Handle defineConfig({ ... }) pattern
      const args = (decl.arguments as ASTNode[]) ?? [];
      if (args[0]?.type === "ObjectExpression") {
        configObject = args[0];
      }
    }

    if (!configObject) continue;

    // Find the `integrations` property
    const props = (configObject.properties as ASTNode[]) ?? [];
    for (const prop of props) {
      const key = prop.key as ASTNode;
      if (key.name === "integrations" || key.value === "integrations") {
        integrationsArray = prop.value as ASTNode;
        break;
      }
    }

    break;
  }

  // No integrations found at all
  if (!integrationsArray) {
    return {
      outcome: "none",
      frameworks: [],
      notes: [],
      edits: []
    };
  }

  // Step 3: Check for spread elements (unsafe)
  if (integrationsArray.type === "ArrayExpression") {
    const elements = (integrationsArray.elements as ASTNode[]) ?? [];

    for (const el of elements) {
      if (!el) continue;
      if (el.type === "SpreadElement") {
        notes.push(
          "The integrations array contains spread elements, which cannot be statically analyzed. " +
            "Please configure multi-framework support manually."
        );
        return {
          outcome: "unsafe",
          frameworks,
          notes,
          edits
        };
      }
    }

    // Step 4: Walk each call in the integrations array
    for (const el of elements) {
      if (!el || el.type !== "CallExpression") continue;
      const callee = el.callee as ASTNode;
      if (callee.type !== "Identifier") continue;

      const bindingName = callee.name as string;
      const packageName = bindingToPackage.get(bindingName);
      if (!packageName) continue;

      const frameworkName = KNOWN_FRAMEWORKS[packageName];
      if (!frameworkName) continue;

      // Check for include/exclude in the call arguments
      const args = (el.arguments as ASTNode[]) ?? [];
      let hasInclude = false;
      let hasExclude = false;

      if (args.length > 0 && args[0]?.type === "ObjectExpression") {
        const optProps = (args[0].properties as ASTNode[]) ?? [];
        for (const optProp of optProps) {
          const optKey = optProp.key as ASTNode;
          const propName = optKey.name ?? optKey.value;
          if (propName === "include") hasInclude = true;
          if (propName === "exclude") hasExclude = true;
        }
      }

      frameworks.push({
        name: frameworkName,
        packageName,
        hasInclude,
        hasExclude,
        integrationCallSpan: {
          start: el.start as number,
          end: el.end as number
        }
      });
    }
  }

  // Step 5: Determine outcome
  if (frameworks.length === 0) {
    // No recognized framework calls found in integrations (even if imports exist)
    if (bindingToPackage.size === 0) {
      return { outcome: "none", frameworks: [], notes: [], edits: [] };
    }
    return { outcome: "none", frameworks: [], notes: [], edits: [] };
  }

  const alreadyConfigured = frameworks.some((f) => f.hasInclude || f.hasExclude);
  if (alreadyConfigured) {
    return {
      outcome: "already-configured",
      frameworks,
      notes,
      edits
    };
  }

  // Safe to add excludes — tell existing frameworks to skip Qwik's directory
  // so Qwik files under src/components/qwik/ are NOT matched by existing frameworks
  for (const fw of frameworks) {
    edits.push({
      type: "add-exclude",
      framework: fw.name,
      span: fw.integrationCallSpan,
      value: `["src/components/qwik/**/*"]`
    });
  }

  return {
    outcome: "safe",
    frameworks,
    notes,
    edits
  };
}
