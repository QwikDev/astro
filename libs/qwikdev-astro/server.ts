import { renderOpts as globalRenderOpts } from "virtual:qwikdev-astro";
import { type JSXNode, jsx } from "@qwik.dev/core";
import type { QwikManifest } from "@qwik.dev/core/optimizer";
import { type RenderToStreamOptions, renderToStream } from "@qwik.dev/core/server";
import type { SSRResult } from "astro";

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
    let defaultSlot: JSXNode<"span"> | undefined = undefined;

    /** slot handling
     *  https://qwik.dev/docs/components/slots/#slots
     *  https://docs.astro.build/en/basics/astro-components/#slots
     */
    for (const [key, value] of Object.entries(slotted)) {
      const namedSlot = key !== "default" && { "q:slot": key };
      const jsxElement = jsx("span", {
        dangerouslySetInnerHTML: String(value),
        style: "display: contents",
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

    const isClientRouter = Array.from(this.result.componentMetadata.keys()).some(
      (key) => key.includes("ClientRouter.astro")
    );

    if (isClientRouter && isInitialContainer) {
      /**
       * ClientRouter support: after Astro swaps the page, the qwikloader's
       * initialization has already fired and won't re-run for new elements.
       *
       * This script mirrors the qwikloader's processReadyStateChange():
       * 1. before-swap: reset Qwik's global state so it re-initializes
       * 2. after-swap: dispatch qinit (document-ready), qidle (document-idle),
       *    and re-observe qvisible (intersection-observer) for new elements
       */
      const clientRouterScript = `<script q-astro-client-router data-astro-rerun>!function(){var d=document;d.addEventListener('astro:before-swap',function(){delete window._qwikEv;delete d.qVNodeData});d.addEventListener('astro:after-swap',function(){d.querySelectorAll('[q-d\\\\:qinit]').forEach(function(e){e.dispatchEvent(new CustomEvent('qinit'));e.removeAttribute('q-d:qinit')});(window.requestIdleCallback||setTimeout)(function(){d.querySelectorAll('[q-d\\\\:qidle]').forEach(function(e){e.dispatchEvent(new CustomEvent('qidle'));e.removeAttribute('q-d:qidle')})});var o=new IntersectionObserver(function(t){t.forEach(function(e){e.isIntersecting&&(o.unobserve(e.target),e.target.dispatchEvent(new CustomEvent('qvisible',{detail:e})))})});d.querySelectorAll('[q-e\\\\:qvisible]:not([q\\\\:observed])').forEach(function(e){o.observe(e);e.setAttribute('q:observed','true')})})}();</script>`;
      return { html: html + clientRouterScript };
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
