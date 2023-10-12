import { h } from "@builder.io/qwik";
import { renderToString } from "@builder.io/qwik/server";
import type { RendererContext } from "./types";
import { manifest } from "@qwik-client-manifest";
import type {
  ResolvedManifest,
  SymbolMapper,
  SymbolMapperFn,
} from "@builder.io/qwik/optimizer";

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
    console.log("End of check");
    return typeof html === "string";
  } catch (error) {
    console.error("Error in check:", error);
  }
}

export async function renderToStaticMarkup(
  this: RendererContext,
  Component: any,
  props: Record<string, any>,
  slotted: any
) {
  try {
    const slots = {};

    for (const [key, value] of Object.entries(slotted)) {
      slots[key] = value;
    }

    const app = h(Component, { props, slots });
    // console.log(app);

    const manifest: ResolvedManifest = {
      mapper: undefined,
      manifest: undefined,
    };

    const symbolMapper: SymbolMapperFn = (
      symbolName: string,
      mapper: SymbolMapper | undefined
    ) => {
      console.log("SymbolMapperFn", symbolName, mapper);
      return [symbolName, "q-mock.js"];
    };

    const html = await renderToString(app, {
      containerTagName: "div",
      // manifest: manifest,
      symbolMapper: symbolMapper,
    });

    console.log("end of renderToStaticMarkup");
    return html;
  } catch (error) {
    console.error("Error in renderToStaticMarkup:", error);
  }
}

export default {
  renderToStaticMarkup,
  supportsAstroStaticSlot: true,
  check,
};
