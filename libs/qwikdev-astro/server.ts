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

const qwikLoaderAdded = new WeakMap<SSRResult, boolean>();

type RendererContext = {
  result: SSRResult;
};

function isInlineComponent(component: unknown): boolean {
  const codeStr = component!.toString().toLowerCase();

  return codeStr.includes("_jsxq") || codeStr.includes("jsxSplit");
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

    const isInline = isInlineComponent(component);
    const base = (props["q:base"] || process.env.Q_BASE) as string;
    let html = "";
    const renderOpts: RenderToStreamOptions = {
      base,
      containerAttributes: { style: "display: contents" },
      containerTagName: "div",
      ...(isDev
        ? {
            manifest: {} as QwikManifest,
            symbolMapper: (globalThis as any).symbolMapperGlobal
          }
        : { manifest }),
      serverData: props,
      stream: {
        write: (chunk) => {
          html += chunk;
        }
      }
    };

    // Handle inline components
    if (isInline) {
      const inlineComponentJSX = component(props);
      await renderToStream(inlineComponentJSX, renderOpts);
      return {
        html
      };
    }

    const shouldAddQwikLoader = !qwikLoaderAdded.has(this.result);
    const qwikLoader =
      shouldAddQwikLoader &&
      jsx("script", {
        "qwik-loader": "",
        dangerouslySetInnerHTML: getQwikLoaderScript()
      });

    // we want to add the sw script only on the first container.
    const serviceWorkerScript =
      !isDev && shouldAddQwikLoader && jsx(PrefetchServiceWorker, {});

    // we want a prefetch graph on each container
    const prefetchGraph = !isDev && jsx(PrefetchGraph, {});

    const slots: { [key: string]: unknown } = {};
    let defaultSlot: JSXNode<"span"> | undefined = undefined;

    const qwikScripts = jsx("span", {
      "q:slot": "qwik-scripts",
      "qwik-scripts": "",
      children: [qwikLoader, serviceWorkerScript, prefetchGraph]
    });

    // this is how we get slots
    for (const [key, value] of Object.entries(slotted)) {
      const jsxElement = jsx("span", {
        dangerouslySetInnerHTML: String(value),
        style: "display: contents",
        ...(key !== "default" && { "q:slot": key }),
        "q:key": Math.random().toString(26).split(".").pop()
      });

      if (key === "default") {
        defaultSlot = jsxElement;
      } else {
        slots[key] = jsxElement;
      }
    }

    const slotValues = Object.values(slots);

    const app = jsx(component, {
      ...props,
      children: [qwikScripts, ...(defaultSlot ? [defaultSlot] : []), ...slotValues]
    });

    if (shouldAddQwikLoader) {
      qwikLoaderAdded.set(this.result, true);
    }

    await renderToStream(app, renderOpts);

    // With View Transitions, rerun so that signals work
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
