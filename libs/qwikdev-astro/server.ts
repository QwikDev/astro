import { type JSXNode, jsx } from "@builder.io/qwik";
import { isDev } from "@builder.io/qwik/build";
import type { QwikManifest } from "@builder.io/qwik/optimizer";
import {
  type RenderToStreamOptions,
  getQwikLoaderScript,
  renderToStream
} from "@builder.io/qwik/server";
import { type SSRResult } from "astro";

const isQwikLoaderAddedMap = new WeakMap<SSRResult, boolean>();

const isSSR = process.env.IS_SSR;

let buildLocation = "/build/";
if (!isSSR) {
  buildLocation = "/client/build/";
}
const modulePreloadScript = `window.addEventListener("load",()=>{(async()=>{window.requestIdleCallback||(window.requestIdleCallback=(e,t)=>{const n=t||{},o=1,i=n.timeout||o,a=performance.now();return setTimeout(()=>{e({get didTimeout(){return!n.timeout&&performance.now()-a-o>i},timeRemaining:()=>Math.max(0,o+(performance.now()-a))})},o)});const e=async()=>{const e=new Set,t=document.querySelectorAll('script[q\\\\:type="prefetch-bundles"]');t.forEach(t=>{if(!t.textContent)return;const n=t.textContent,o=n.match(/\\["prefetch","[/]build[/]","(.*?)"\\]/);o&&o[1]&&o[1].split('","').forEach(t=>{t.startsWith("q-")&&e.add(t)})}),document.querySelectorAll('script[type="qwik/json"]').forEach(t=>{if(!t.textContent)return;const n=t.textContent.match(/q-[A-Za-z0-9_-]+\\.js/g);n&&n.forEach(t=>e.add(t))}),e.forEach(e=>{const t=document.createElement("link");t.rel="modulepreload",t.href="${buildLocation}"+e,t.fetchPriority="low",document.head.appendChild(t)})};await requestIdleCallback(await e)})()});`;

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
    const devUrls = new Set<string>();

    const renderToStreamOpts: RenderToStreamOptions = {
      containerAttributes: {
        style: "display: contents",
        ...(isDev && { "q-astro-marker": "" })
      },
      containerTagName: "div",
      ...(isDev
        ? {
            manifest: {} as QwikManifest,
            symbolMapper: (symbolName, mapper, parent) => {
              const requestUrl = new URL(this.result.request.url);
              const origin = requestUrl.origin;
              const devUrl = origin + parent + "_" + symbolName + ".js";
              devUrls.add(devUrl);

              // this determines if the container is the last one
              renderToStreamOpts.containerAttributes!["q-astro-marker"] = "last";

              return globalThis.symbolMapperFn(symbolName, mapper, parent);
            }
          }
        : {
            manifest: globalThis.qManifest
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

    // https://qwik.dev/docs/advanced/qwikloader/#qwikloader
    const isQwikLoaderNeeded = !isQwikLoaderAddedMap.has(this.result);
    const qwikLoader =
      isQwikLoaderNeeded &&
      jsx("script", {
        "qwik-loader": "",
        dangerouslySetInnerHTML: getQwikLoaderScript()
      });

    const modulePreload =
      isQwikLoaderNeeded &&
      jsx("script", {
        "qwik-astro-preloader": "",
        dangerouslySetInnerHTML: modulePreloadScript
      });

    /**
     * service worker script is only added to the page once, and in prod.
     * https://github.com/QwikDev/qwik/pull/5618
     */
    const qwikScripts = jsx("span", {
      "q:slot": "qwik-scripts",
      "qwik-scripts": "",
      children: [qwikLoader, modulePreload]
    });

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
      children: [qwikScripts, defaultSlot, ...slotValues]
    });

    if (isQwikLoaderNeeded) {
      isQwikLoaderAddedMap.set(this.result, true);
      renderToStreamOpts.containerAttributes!["q-astro-marker"] = "first";
    }

    await renderToStream(qwikComponentJSX, renderToStreamOpts);

    // we only want to add the preloader script if the container is the last one
    if (isDev && devUrls.size > 0) {
      const preloaderScript = `<script q-astro-dev-preloader>
        window.addEventListener("load",()=>{
          const symbols = ${JSON.stringify(Array.from(devUrls))};
          symbols.forEach(symbol => {
            const link = document.createElement('link');
            link.rel = 'modulepreload';
            link.href = symbol;
            link.fetchPriority = 'low';
            document.head.appendChild(link);
          });
        });
      </script>`;

      // if there is one container, add the preloader script to the first one
      if (html.includes('q-astro-marker="first"')) {
        html += preloaderScript;
      }

      // if there is more than one container, add the preloader script to the last one
      if (html.includes('q-astro-marker="last"')) {
        html += preloaderScript;
      }
    }

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
      ${isQwikLoaderNeeded ? `<script data-qwik-astro-client-router>document.addEventListener('astro:after-swap',()=>{const e=document.querySelectorAll('[on\\\\:qvisible]');if(e.length){const o=new IntersectionObserver(e=>{e.forEach(e=>{e.isIntersecting&&(e.target.dispatchEvent(new CustomEvent('qvisible')),o.unobserve(e.target))})});e.forEach(e=>o.observe(e))}});</script>` : ""}
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
