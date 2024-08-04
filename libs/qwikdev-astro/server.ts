import type { SSRResult } from "astro";

import {
  type JSXNode,
  PrefetchGraph,
  PrefetchServiceWorker,
  jsx
} from "@builder.io/qwik";
import { isDev } from "@builder.io/qwik/build";
import type { QwikManifest } from "@builder.io/qwik/optimizer";
import {
  type RenderToStreamOptions,
  getQwikLoaderScript,
  renderToStream
} from "@builder.io/qwik/server";
import { manifest } from "@qwik-client-manifest";

const isQwikLoaderAddedMap = new WeakMap<SSRResult, boolean>();

type RendererContext = {
  result: SSRResult;
};

function isInlineComponent(component: unknown): boolean {
  if (typeof component !== "function") return false;
  const codeStr = component!.toString().toLowerCase();
  return (
    (codeStr.includes("_jsxq") || codeStr.includes("jsxsplit")) &&
    component.name !== "QwikComponent"
  );
}

function isQwikComponent(component: unknown) {
  if (typeof component !== "function") return false;
  if (isInlineComponent(component)) return true;
  if (component.name !== "QwikComponent") return false;

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
  // biome-ignore lint/suspicious/noExplicitAny: unknown type of component.
  component: any,
  props: Record<string, unknown>,
  // biome-ignore lint/suspicious/noExplicitAny: unknown type of slotted.
  slotted: any
) {
  try {
    if (!isQwikComponent(component)) {
      return;
    }

    const base = (props["q:base"] || process.env.Q_BASE) as string;

    // html that gets added to the stream
    let html = "";

    const renderToStreamOpts: RenderToStreamOptions = {
      base,
      containerAttributes: { style: "display: contents" },
      containerTagName: "div",
      ...(isDev
        ? {
            manifest: {} as QwikManifest,
            symbolMapper: globalThis.symbolMapperFn
          }
        : { manifest }),
      serverData: props,
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

    /**
     * service worker script is only added to the page once, and in prod.
     * https://github.com/QwikDev/qwik/pull/5618
     */
    const serviceWorkerScript =
      !isDev && isQwikLoaderNeeded && jsx(PrefetchServiceWorker, {});
    const prefetchGraph = !isDev && jsx(PrefetchGraph, {});
    const qwikScripts = jsx("span", {
      "q:slot": "qwik-scripts",
      "qwik-scripts": "",
      children: [qwikLoader, serviceWorkerScript, prefetchGraph]
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
        "q:key": globalThis.hash
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

    /** With View Transitions, rerun so that signals work
     * https://docs.astro.build/en/guides/view-transitions/#data-astro-rerun
     */
    const htmlWithRerun = html.replace(
      '<script q:func="qwik/json">',
      '<script q:func="qwik/json" data-astro-rerun>'
    );

    return {
      html: htmlWithRerun
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
