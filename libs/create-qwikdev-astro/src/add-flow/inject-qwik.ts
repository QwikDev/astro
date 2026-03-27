import MagicString from "magic-string";
import { parseSync } from "oxc-parser";

type ASTNode = Record<string, unknown>;

/**
 * Inject `import qwik from "@qwik.dev/astro"` and `qwik()` into an existing
 * astro.config source string, using the import name `qwik` (not the
 * camelCased `qwikDev` that `astro add` would generate).
 *
 * @returns The rewritten source, or null if injection failed (e.g. no default export found)
 */
export function injectQwikIntegration(source: string): string | null {
  const parsed = parseSync("astro.config.ts", source, {
    sourceType: "module"
  });

  const body = parsed.program?.body ?? [];
  const ms = new MagicString(source);

  // Check if qwik is already imported
  let alreadyImported = false;
  let lastImportEnd = 0;

  for (const node of body) {
    const n = node as unknown as ASTNode;
    if (n.type !== "ImportDeclaration") continue;

    const end = n.end as number;
    if (end > lastImportEnd) lastImportEnd = end;

    const src = n.source as ASTNode | undefined;
    const pkg = src?.value as string | undefined;
    if (pkg === "@qwik.dev/astro" || pkg === "@qwikdev/astro") {
      alreadyImported = true;
    }
  }

  // Add import statement after the last import (or at top of file)
  if (!alreadyImported) {
    const importStatement = `import qwik from "@qwik.dev/astro";\n`;
    if (lastImportEnd > 0) {
      ms.appendLeft(lastImportEnd, `\n${importStatement}`);
    } else {
      ms.prepend(importStatement);
    }
  }

  // Find the integrations array and add qwik()
  for (const node of body) {
    const n = node as unknown as ASTNode;
    if (n.type !== "ExportDefaultDeclaration") continue;

    const decl = n.declaration as ASTNode;
    let configObject: ASTNode | null = null;

    if (decl.type === "ObjectExpression") {
      configObject = decl;
    } else if (decl.type === "CallExpression") {
      const args = (decl.arguments as ASTNode[]) ?? [];
      if (args[0]?.type === "ObjectExpression") {
        configObject = args[0];
      }
    }

    if (!configObject) return null;

    const props = (configObject.properties as ASTNode[]) ?? [];
    let integrationsNode: ASTNode | null = null;

    for (const prop of props) {
      const key = prop.key as ASTNode;
      if (key.name === "integrations" || key.value === "integrations") {
        integrationsNode = prop.value as ASTNode;
        break;
      }
    }

    if (integrationsNode && integrationsNode.type === "ArrayExpression") {
      // Check if qwik() is already in the array
      const elements = (integrationsNode.elements as ASTNode[]) ?? [];
      const hasQwik = elements.some((el) => {
        if (!el || el.type !== "CallExpression") return false;
        const callee = el.callee as ASTNode;
        return callee.type === "Identifier" && callee.name === "qwik";
      });

      if (!hasQwik) {
        const arrayStart = integrationsNode.start as number;
        // Insert after the opening bracket
        if (elements.length === 0) {
          ms.appendLeft(arrayStart + 1, "qwik()");
        } else {
          // Add before the first element
          const firstEl = elements[0];
          const firstStart = firstEl.start as number;
          ms.appendLeft(firstStart, "qwik(), ");
        }
      }
    } else if (!integrationsNode) {
      // No integrations property — add one
      const objStart = configObject.start as number;
      const inner = source.slice(objStart + 1).trimStart();
      if (inner.length === 0 || source[objStart + 1] === "}") {
        // Empty object
        ms.overwrite(objStart, (configObject.end as number), `{\n  integrations: [qwik()]\n}`);
      } else {
        ms.appendLeft(objStart + 1, `\n  integrations: [qwik()],`);
      }
    }

    break;
  }

  return ms.toString();
}
