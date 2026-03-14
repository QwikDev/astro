import { renderOpts as globalRenderOpts } from "virtual:qwikdev-astro";
import { type JSXNode, jsx } from "@builder.io/qwik";
import { isDev } from "@builder.io/qwik/build";
import type { QwikManifest } from "@builder.io/qwik/optimizer";
import { type RenderToStreamOptions, renderToStream } from "@builder.io/qwik/server";
import type { SSRResult } from "astro";

const containerMap = new WeakMap<SSRResult, boolean>();

type RendererContext = {
  result: SSRResult;
};

/**
 *  Because inline components are very much like normal functions, it's hard to distinguish them from normal functions.
 *
 * We currently identify them through the jsx transform function call.
 *
 * In Qwik v1, the identifiers are _jsxQ - _jsxC - _jsxS
 *
 * In Qwik v2, it is jsxsplit and I believe jsxSorted
 *
 */
function isInlineComponent(component: unknown): boolean {
  if (typeof component !== "function") {
    return false;
  }
  const codeStr = component?.toString().toLowerCase();
  const qwikJsxIdentifiers = ["_jsxq", "_jsxc", "_jsxs", "jsxsplit"];
  return (
    qwikJsxIdentifiers.some((id) => codeStr.includes(id)) &&
    component.name !== "QwikComponent"
  );
}

function isQwikComponent(component: unknown) {
  if (typeof component !== "function") {
    return false;
  }
  if (isInlineComponent(component)) {
    return true;
  }
  if (component.name !== "QwikComponent") {
    return false;
  }

  return true;
}

async function check(this: RendererContext, component: unknown) {
  try {
    return isQwikComponent(component);
  } catch (error) {
    console.error("Error in check function of @qwikdev/astro: ", error);
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

    // https://qwik.dev/docs/advanced/qwikloader/#qwikloader
    const isInitialContainer = !containerMap.has(this.result);

    const renderToStreamOpts: RenderToStreamOptions = {
      ...(props.renderOpts ?? globalRenderOpts ?? {}),
      containerAttributes: {
        style: "display: contents",
        ...(isDev && { "q-astro-marker": "" })
      },
      qwikLoader: isInitialContainer ? { include: "always" } : { include: "never" },
      containerTagName: "div",
      ...(isDev && {
        symbolMapper: globalThis.symbolMapperFn,
        manifest: {} as QwikManifest
      }),
      serverData: props,
      qwikPrefetchServiceWorker: {
        include: false
      },
      stream: {
        write: (chunk) => {
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
    });

    if (isInitialContainer) {
      containerMap.set(this.result, true);
      renderToStreamOpts.containerAttributes!["q-astro-marker"] = "first";
    }

    await renderToStream(qwikComponentJSX, renderToStreamOpts);

    const isClientRouter = Array.from(this.result._metadata.renderedScripts).some(
      (path) => path.includes("ClientRouter.astro")
    );

    /** With View Transitions, rerun so that signals work
     * https://docs.astro.build/en/guides/view-transitions/#data-astro-rerun
     */
    const htmlWithRerun = html.replace(
      '<script q:func="qwik/json">',
      '<script q:func="qwik/json" data-astro-rerun>'
    );

    /** Adds support for visible tasks with Astro's client router */
    const htmlWithObservers =
      isClientRouter &&
      htmlWithRerun +
        `
      ${isInitialContainer ? `<script data-qwik-astro-client-router>document.addEventListener('astro:after-swap',()=>{const e=document.querySelectorAll('[on\\\\:qvisible]');if(e.length){const o=new IntersectionObserver(e=>{e.forEach(e=>{e.isIntersecting&&(e.target.dispatchEvent(new CustomEvent('qvisible')),o.unobserve(e.target))})});e.forEach(e=>o.observe(e))}});</script>` : ""}
    `;

    return {
      html: isClientRouter ? htmlWithObservers : html
    };
  } catch (error) {
    console.error("Error in renderToStaticMarkup function of @qwikdev/astro: ", error);
    throw error;
  }
}

export default {
  renderToStaticMarkup,
  supportsAstroStaticSlot: true,
  check
};
