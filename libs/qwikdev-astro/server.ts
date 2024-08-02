import type { SSRResult } from "astro";

import {
  type JSXNode,
  PrefetchGraph,
  PrefetchServiceWorker,
  jsx
} from "@builder.io/qwik";
import { isDev } from "@builder.io/qwik/build";
import type { QwikManifest } from "@builder.io/qwik/optimizer";
import { getQwikLoaderScript, renderToString } from "@builder.io/qwik/server";
import { manifest } from "@qwik-client-manifest";

const qwikLoaderAdded = new WeakMap<SSRResult, boolean>();

type RendererContext = {
  result: SSRResult;
};

function isInlineComponent(component: unknown): boolean {
  return component!.toString().toLowerCase().includes("_jsxq");
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
    const renderConfig = {
      base,
      containerTagName: "div",
      containerAttributes: { style: "display: contents" },
      ...(isDev
        ? {
            manifest: {} as QwikManifest,
            symbolMapper: (globalThis as any).symbolMapperGlobal
          }
        : { manifest }),
      qwikLoader: { include: "never" }
    } as const;

    // Handle inline components
    if (isInline) {
      const inlineComponentJSX = component(props);

      const result = await renderToString(inlineComponentJSX, renderConfig);

      return {
        html: result.html
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

    // TODO: `jsx` must correctly be imported.
    // Currently the vite loads `core.mjs` and `core.prod.mjs` at the same time and this causes issues.
    // WORKAROUND: ensure that `npm postinstall` is run to patch the `@builder.io/qwik/package.json` file.
    const result = await renderToString(app, renderConfig);

    const { html } = result;

    // With VT, rerun so that signals work
    const htmlWithRerun = html.replace(
      '<script q:func="qwik/json">',
      '<script q:func="qwik/json" data-astro-rerun>'
    );

    return {
      ...result,
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
