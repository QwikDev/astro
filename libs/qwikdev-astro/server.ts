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

    const renderToStreamOpts: RenderToStreamOptions = {
      containerAttributes: { style: "display: contents" },
      containerTagName: "div",
      ...(isDev
        ? {
            manifest: {} as QwikManifest,
            symbolMapper: globalThis.symbolMapperFn
          }
        : {
            manifest: globalThis.qManifest || JSON.parse(manifest)
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

export const manifest =
  '{"manifestHash":"ksjrps","symbols":{"s_0DHRa0FqCj4":{"origin":"../../../libs/qwikdev-astro/src/root.tsx","displayName":"root.tsx_root_component","canonicalFilename":"root.tsx_root_component_0DHRa0FqCj4","hash":"0DHRa0FqCj4","ctxKind":"function","ctxName":"component$","captures":false,"loc":[81,136]},"s_qY02pQHKSts":{"origin":"components/qwik/counter.tsx","displayName":"counter.tsx_Counter_component","canonicalFilename":"counter.tsx_Counter_component_qY02pQHKSts","hash":"qY02pQHKSts","ctxKind":"function","ctxName":"component$","captures":false,"loc":[121,322]},"s_WDqUvWziK5k":{"origin":"components/qwik/counter.tsx","displayName":"counter.tsx_Counter_component_Fragment_button_onClick","canonicalFilename":"counter.tsx_Counter_component_Fragment_button_onClick_WDqUvWziK5k","hash":"WDqUvWziK5k","ctxKind":"eventHandler","ctxName":"onClick$","captures":true,"parent":"s_qY02pQHKSts","loc":[235,256]}},"mapping":{"s_0DHRa0FqCj4":"q-CXpka_yH.js","s_qY02pQHKSts":"q-4LT-psvh.js","s_WDqUvWziK5k":"q-Cf-M9i3S.js"},"bundles":{"q-4LT-psvh.js":{"size":88,"imports":["q-Cf-M9i3S.js","q-CXpka_yH.js"],"symbols":["s_qY02pQHKSts"]},"q-Cf-M9i3S.js":{"size":1635,"imports":["q-CXpka_yH.js"],"origins":["src/components/qwik/counter.tsx_Counter_component_Fragment_button_onClick_WDqUvWziK5k.js","src/components/qwik/counter.tsx_Counter_component_qY02pQHKSts.js"],"symbols":["s_WDqUvWziK5k"]},"q-CXpka_yH.js":{"size":61657,"origins":["../../libs/qwikdev-astro/src/root.tsx_root_component_0DHRa0FqCj4.js","../../node_modules/.pnpm/@builder.io+qwik@1.12.0_vite@6.0.6_@types+node@22.10.2_jiti@2.4.2_yaml@2.6.1_/node_modules/@builder.io/qwik/dist/core.prod.mjs","@builder.io/qwik/build"],"symbols":["s_0DHRa0FqCj4"]},"q-FfniopH8.js":{"size":184,"imports":["q-Cf-M9i3S.js","q-CXpka_yH.js"],"dynamicImports":["q-CXpka_yH.js"],"origins":["../../libs/qwikdev-astro/src/root.tsx"]},"q-fzuY5JUw.js":{"size":171,"imports":["q-Cf-M9i3S.js","q-CXpka_yH.js"],"dynamicImports":["q-4LT-psvh.js"],"origins":["src/components/qwik/counter.tsx"]}},"injections":[],"version":"1","options":{"target":"client","buildMode":"production","entryStrategy":{"type":"smart"}},"platform":{"qwik":"1.12.0","vite":"","rollup":"4.29.1","env":"node","os":"darwin","node":"22.12.0"}}';
