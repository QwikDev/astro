import { jsx } from "@builder.io/qwik";
import { getQwikLoaderScript, renderToString } from "@builder.io/qwik/server";
import { manifest } from "@qwik-client-manifest";
import { isDev } from "@builder.io/qwik/build";
import type { QwikManifest, SymbolMapperFn } from "@builder.io/qwik/optimizer";
import type { SSRResult } from "astro";
import { PrefetchGraph, PrefetchServiceWorker } from "@builder.io/qwik";

const qwikLoaderAdded = new WeakMap<SSRResult, boolean>();

type RendererContext = {
  result: SSRResult;
};

async function check(
  this: RendererContext,
  Component: any,
  props: Record<string, any>,
  slotted: any
) {
  try {
    if (typeof Component !== "function") return false;

    if (Component.name !== "QwikComponent") {
      return false;
    }

    return true;
  } catch (error) {
    console.error("Error in check function of @qwikdev/astro: ", error);
  }
}

export async function renderToStaticMarkup(
  this: RendererContext,
  Component: any,
  props: Record<string, any>,
  slotted: any
) {
  try {
    if (Component.name !== "QwikComponent") {
      return;
    }

    const slots: { [key: string]: any } = {};
    let defaultSlot;

    // getting functions from index causes a rollup issue.
    for (const [key, value] of Object.entries(slotted)) {
      const jsxElement = jsx("span", {
        dangerouslySetInnerHTML: String(value),
        style: "display: contents",
        ...(key !== "default" && { "q:slot": key }),
        "q:key": Math.random().toString(26).split(".").pop(),
      });

      if (key === "default") {
        defaultSlot = jsxElement;
      } else {
        slots[key] = jsxElement;
      }
    }

    const app = jsx(Component, {
      ...props,
      children: [defaultSlot, ...Object.values(slots)],
    });

    const symbolMapper: SymbolMapperFn = (symbolName: string) => {
      return [
        symbolName,
        `/${process.env.SRC_DIR}/` + symbolName.toLocaleLowerCase() + ".js",
      ];
    };

    const shouldAddQwikLoader = !qwikLoaderAdded.has(this.result);
    if (shouldAddQwikLoader) {
      qwikLoaderAdded.set(this.result, true);
    }

    const base = props["q:base"] || process.env.Q_BASE;

    // TODO: `jsx` must correctly be imported.
    // Currently the vite loads `core.mjs` and `core.prod.mjs` at the same time and this causes issues.
    // WORKAROUND: ensure that `npm postinstall` is run to patch the `@builder.io/qwik/package.json` file.
    const result = await renderToString(app, {
      base,
      containerTagName: "div",
      containerAttributes: { style: "display: contents" },
      manifest: isDev ? ({} as QwikManifest) : manifest,
      symbolMapper: manifest ? undefined : symbolMapper,
      qwikLoader: { include: "never" },
    });

    /* scripts we need on first component vs. each */
    const { html } = result;
    let scripts = `
      <script>
        ${PrefetchGraph}
      </script>
    `;

    if (shouldAddQwikLoader) {
      scripts = `
        <script>
          ${getQwikLoaderScript()}
        </script>
        <script>
          ${PrefetchServiceWorker}
        </script>
      ${scripts}`;
    }

    // Find the closing tag of the div with the `q:container` attribute
    const closingContainerTag = html.lastIndexOf("</div>");

    // Insert the scripts before the closing tag
    const htmlWithScripts = `${html.substring(
      0,
      closingContainerTag
    )}${scripts}${html.substring(closingContainerTag)}`;

    return {
      ...result,
      html: htmlWithScripts,
    };
  } catch (error) {
    console.error(
      "Error in renderToStaticMarkup function of @qwikdev/astro: ",
      error
    );
    throw error;
  }
}

export default {
  renderToStaticMarkup,
  supportsAstroStaticSlot: true,
  check,
};
