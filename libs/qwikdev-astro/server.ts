import { renderOpts as globalRenderOpts } from "virtual:qwikdev-astro";
import { type JSXNode, jsx } from "@qwik.dev/core";
import { SSRComment } from "@qwik.dev/core/internal";
import type { QwikManifest } from "@qwik.dev/core/optimizer";
import { type RenderToStreamOptions, renderToStream } from "@qwik.dev/core/server";
import type { SSRResult } from "astro";
import clientRouterScript from "./src/client-router.js?raw";

const containerMap = new WeakMap<SSRResult, boolean>();
type RendererContext = {
  result: SSRResult;
};

/** Detects component$() components via the SERIALIZABLE_STATE symbol that survives minification. */
function hasSerializableState(component: Function): boolean {
  const symbols = Object.getOwnPropertySymbols(component);
  return symbols.some((s) => {
    const val = (component as any)[s];
    return Array.isArray(val);
  });
}

/**
 * Inline components are plain functions that use Qwik JSX transforms.
 * We identify them through the jsx transform function call in their source.
 *
 * In Qwik v1, the identifiers are _jsxQ - _jsxC - _jsxS
 * In Qwik v2, the identifiers are _jsxSorted and _jsxSplit
 */
function isInlineComponent(component: unknown): boolean {
  if (typeof component !== "function") {
    return false;
  }
  const codeStr = component.toString().toLowerCase();
  const qwikJsxIdentifiers = [
    "_jsxsorted",
    "_jsxsplit",
    "_jsxq",
    "_jsxc",
    "_jsxs",
  ];
  return (
    qwikJsxIdentifiers.some((id) => codeStr.includes(id)) &&
    !hasSerializableState(component)
  );
}

function isQwikComponent(component: unknown) {
  if (typeof component !== "function") {
    return false;
  }
  return (
    hasSerializableState(component) ||
    component.name === "QwikComponent" ||
    isInlineComponent(component)
  );
}

async function check(this: RendererContext, component: unknown) {
  try {
    return isQwikComponent(component);
  } catch (error) {
    console.error("Error in check function of @qwik.dev/astro: ", error);
    return false;
  }
}

export async function renderToStaticMarkup(
  this: RendererContext,
  component: any,
  props: Record<string, unknown>,
  slotted: any
) {
  try {
    if (!isQwikComponent(component)) {
      return;
    }

    let html = "";

    const renderToStreamOpts: RenderToStreamOptions = {
      ...(props.renderOpts ?? globalRenderOpts ?? {}),
      containerAttributes: {
        style: "display: contents"
      },
      containerTagName: "div",
      manifest: (props.manifest ?? {}) as QwikManifest,
      serverData: props,
      stream: {
        write: (chunk: string) => {
          html += chunk;
        }
      }
    };

    // https://qwik.dev/docs/components/overview/#inline-components
    const isInline = isInlineComponent(component);
    if (isInline) {
      const inlineComponentJSX = component(props);
      // we don't want to process slots for inline components
      await renderToStream(inlineComponentJSX, renderToStreamOpts);
      return {
        html
      };
    }

    const slots: { [key: string]: unknown } = {};
    let defaultSlot: JSXNode | undefined = undefined;
    const slotMarkers = new Map<string, string>();

    /** slot handling
     *  https://qwik.dev/docs/components/slots/#slots
     *  https://docs.astro.build/en/basics/astro-components/#slots
     *
     *  SSRComment placeholder during SSR, replaced with actual
     *  slot content after render.
     */
    for (const [key, value] of Object.entries(slotted)) {
      const markerId = `astro-slot:${key}`;
      slotMarkers.set(`<!--${markerId}-->`, String(value));
      const namedSlot = key !== "default" && { "q:slot": key };
      const jsxElement = jsx(SSRComment as any, {
        data: markerId,
        ...namedSlot,
        "q:key": Math.random().toString(26).split(".").pop()
      });

      if (key === "default") {
        defaultSlot = jsxElement;
      } else {
        slots[key] = jsxElement;
      }
    }

    const slotValues = Object.values(slots);
    const qwikComponentJSX = jsx(component, {
      ...props,
      children: [defaultSlot, ...slotValues]
    }) as Parameters<typeof renderToStream>[0];

    const isInitialContainer = !containerMap.has(this.result);
    if (isInitialContainer) {
      containerMap.set(this.result, true);
    }

    await renderToStream(qwikComponentJSX, renderToStreamOpts);

    for (const [marker, content] of slotMarkers) {
      html = html.replace(marker, content);
    }

    if (isInitialContainer) {
      let hasClientRouter = false;
      for (const s of this.result._metadata?.renderedScripts || []) {
        if (s.includes("ClientRouter")) { hasClientRouter = true; break; }
      }

      if (hasClientRouter) {
        html += `<script q-astro-client-router data-astro-exec="">${clientRouterScript}</script>`;
      }
    }

    return { html };
  } catch (error) {
    console.error("Error in renderToStaticMarkup function of @qwik.dev/astro: ", error);
    throw error;
  }
}

export default {
  renderToStaticMarkup,
  supportsAstroStaticSlot: true,
  check
};
