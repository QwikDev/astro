import { isNode, qAstroManifestPath } from "inox:inline-mod:mod_0";
import { type JSXNode, jsx } from "@builder.io/qwik";
import { isDev } from "@builder.io/qwik/build";
import type { QwikManifest } from "@builder.io/qwik/optimizer";
import {
  type RenderToStreamOptions,
  getQwikLoaderScript,
  renderToStream
} from "@builder.io/qwik/server";
import type { SSRResult } from "astro";

const isQwikLoaderAddedMap = new WeakMap<SSRResult, boolean>();
const modulePreloadScript = `window.addEventListener("load",()=>{(async()=>{window.requestIdleCallback||(window.requestIdleCallback=(e,t)=>{const n=t||{},o=1,i=n.timeout||o,a=performance.now();return setTimeout(()=>{e({get didTimeout(){return!n.timeout&&performance.now()-a-o>i},timeRemaining:()=>Math.max(0,o+(performance.now()-a))})},o)});const e=async()=>{const e=new Set,t=document.querySelectorAll('script[q\\\\:type="prefetch-bundles"]');t.forEach(t=>{if(!t.textContent)return;const n=t.textContent,o=n.match(/\\["prefetch","[/]build[/]","(.*?)"\\]/);o&&o[1]&&o[1].split('","').forEach(t=>{t.startsWith("q-")&&e.add(t)})}),document.querySelectorAll('script[type="qwik/json"]').forEach(t=>{if(!t.textContent)return;const n=t.textContent.match(/q-[A-Za-z0-9_-]+\\.js/g);n&&n.forEach(t=>e.add(t))}),e.forEach(e=>{const t=document.createElement("link");t.rel="modulepreload",t.href="/build/"+e,t.fetchPriority="low",document.head.appendChild(t)})};await requestIdleCallback(await e)})()});`;

type RendererContext = {
  result: SSRResult;
};

function isInlineComponent(component: unknown): boolean {
  if (typeof component !== "function") {
    return false;
  }
  const codeStr = component?.toString().toLowerCase();
  return (
    (codeStr.includes("_jsxq") || codeStr.includes("jsxsplit")) &&
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

    let integrationManifest = null;

    /**
     * fallback to dynamic import if node is false. Node is preferred because  most deployment providers still use older versions of node by default, so dynamic json imports will fail.
     *
     * Until this improves, we'll use node's readFileSync, with dynamic json imports for those not using node.
     */
    if (isNode) {
      try {
        console.log("BEFORE NODE IMPORT");
        const { readFileSync } = await import("node:fs");
        console.log("qAstroManifestPath", qAstroManifestPath);
        const manifestContent = readFileSync(qAstroManifestPath, "utf-8");
        console.log("manifestContent", manifestContent);
        integrationManifest = JSON.parse(manifestContent);
      } catch (error) {
        console.log("ERROR", error);

        throw new Error(
          `@qwikdev/astro: Failed to read the q-astro-manifest.json file. This file is required for the @qwikdev/astro integration to work. 
          
          It seems like you're using node. If this is not the case, please set the isNode option to false in the integration options in astro.config.mjs.
          
          Also make sure this is the case with both your local and deployed environment.`
        );
      }
    } else {
      try {
        integrationManifest = await import(/* @vite-ignore */ qAstroManifestPath, {
          with: { type: "json" }
        });
      } catch (error) {
        throw new Error(
          `@qwikdev/astro: Failed to read the q-astro-manifest.json file. This file is required for the @qwikdev/astro integration to work. 
          
          Because isNode is set to false, the integration will use dynamic json imports to read the q-astro-manifest.json file. Check to make sure this environment supports dynamic json imports.`
        );
      }
    }

    const renderToStreamOpts: RenderToStreamOptions = {
      containerAttributes: { style: "display: contents" },
      containerTagName: "div",
      ...(isDev
        ? {
            manifest: {} as QwikManifest,
            symbolMapper: globalThis.symbolMapperFn
          }
        : {
            manifest:
              globalThis.qManifest || integrationManifest?.default || integrationManifest
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
      isQwikLoaderNeeded &&
      htmlWithRerun +
        `
      <script data-qwik-astro-client-router>document.addEventListener('astro:after-swap',()=>{const e=document.querySelectorAll('[on\\\\:qvisible]');if(e.length){const o=new IntersectionObserver(e=>{e.forEach(e=>{e.isIntersecting&&(e.target.dispatchEvent(new CustomEvent('qvisible')),o.unobserve(e.target))})});e.forEach(e=>o.observe(e))}});</script>
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
  testing123: true,
  check
};
