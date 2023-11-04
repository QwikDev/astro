import { jsx } from "@builder.io/qwik";
import { renderToString } from "@builder.io/qwik/server";
import type { RendererContext } from "./types";
import { manifest } from "@qwik-client-manifest";
import type { SymbolMapper, SymbolMapperFn } from "@builder.io/qwik/optimizer";

async function check(
  this: RendererContext,
  Component: any,
  props: Record<string, any>,
  slotted: any
) {
  try {
    if (typeof Component !== "function") return false;
    const { html } = await renderToStaticMarkup.call(
      this,
      Component,
      props,
      slotted
    );
    return typeof html === "string";
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
    const slots: { [key: string]: any } = {};

    for (const [key, value] of Object.entries(slotted)) {
      slots[key] = value;
    }

    const app = jsx(Component, { props, slots });

    const symbolMapper: SymbolMapperFn = (
      symbolName: string,
      mapper: SymbolMapper | undefined
    ) => {
      return [symbolName, "/src/" + symbolName.toLocaleLowerCase() + ".js"];
    };

    // TODO: `jsx` must correctly be imported.
    // Currently the vite loads `core.mjs` and `core.prod.mjs` at the same time and this causes issues.
    // WORKAROUND: ensure that `npm postinstall` is run to patch the `@builder.io/qwik/package.json` file.
    const result = await renderToString(app, {
      containerTagName: "div",
      containerAttributes: { style: "display: contents" },
      manifest: manifest,
      symbolMapper: manifest ? undefined : symbolMapper,
      qwikLoader: { include: "never" },
    });

    return result;
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
