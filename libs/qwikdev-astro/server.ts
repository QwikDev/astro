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

    let hasClientRouter = false;
    for (const s of this.result._metadata?.renderedScripts || []) {
      if (s.includes("ClientRouter")) { hasClientRouter = true; break; }
    }

    if (hasClientRouter && isInitialContainer) {
      /**
       * ClientRouter support: after Astro swaps the page, the qwikloader's
       * initialization has already fired and won't re-run for new elements.
       *
       * This script:
       * 1. Suppresses harmless errors from Astro's replaceWith function on Qwik's : attribute
       * 2. before-swap: marks Qwik scripts appropriately for re-execution
       * 3. after-swap: re-dispatches qinit/qidle/qvisible lifecycle events
       */
      const clientRouterScript = `<script q-astro-client-router data-astro-exec="">!function(){window.addEventListener('error',function(e){if(e.message&&(e.message.indexOf('replaceWith')!==-1||e.message.indexOf('has already been declared')!==-1)){e.preventDefault()}});window.addEventListener('unhandledrejection',function(e){if(e.reason&&e.reason.message&&e.reason.message.indexOf('replaceWith')!==-1){e.preventDefault()}});var d=document;d.addEventListener('astro:before-swap',function(ev){d.qVNodeData=null;var nd=ev.newDocument;if(nd){var scripts=nd.querySelectorAll('script');scripts.forEach(function(s){var i,hasColon=false,hasType=s.getAttribute('type'),isMod=s.hasAttribute('src');for(i=0;i<s.attributes.length;i++){if(s.attributes[i].name===':'){hasColon=true;break}}if(hasColon){if(isMod){s.dataset.astroExec=''}else if(hasType&&hasType!=='module'&&hasType!=='text/javascript'){s.dataset.astroExec=''}else{s.dataset.astroRerun=''}}})}});d.addEventListener('astro:after-swap',function(){d.qVNodeData=null;d.querySelectorAll('[q\\\\:container]').forEach(function(e){e.qContainer=null});d.querySelectorAll('[q-d\\\\:qinit]').forEach(function(e){e.dispatchEvent(new CustomEvent('qinit'));e.removeAttribute('q-d:qinit')});(window.requestIdleCallback||setTimeout)(function(){d.querySelectorAll('[q-d\\\\:qidle]').forEach(function(e){e.dispatchEvent(new CustomEvent('qidle'));e.removeAttribute('q-d:qidle')})});var o=new IntersectionObserver(function(t){t.forEach(function(e){e.isIntersecting&&(o.unobserve(e.target),e.target.dispatchEvent(new CustomEvent('qvisible',{detail:e})))})});d.querySelectorAll('[q-e\\\\:qvisible]:not([q\\\\:observed])').forEach(function(e){o.observe(e);e.setAttribute('q:observed','true')})})}();</script>`;
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
