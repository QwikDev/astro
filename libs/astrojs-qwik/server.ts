// libs/astrojs-qwik/server.ts
import { h } from "@builder.io/qwik";
import { renderToString } from "@builder.io/qwik/server";
import type { RendererContext } from "./types";
import Root from "@astrojs/qwik/root";

function check(
  this: RendererContext,
  Component: any,
  props: Record<string, any>,
  slotted: any
) {
  console.log("Inside check");
  if (typeof Component !== "function") return false;
  const { html } = renderToStaticMarkup.call(this, Component, props, slotted);
  return typeof html === "string";
}

export async function renderToStaticMarkup(
  this: RendererContext,
  Component: any,
  props: Record<string, any>,
  slotted: any
) {
  const slots = {};
  console.log("Inside renderToStaticMarkup");
  for (const [key, value] of Object.entries(slotted)) {
    slots[key] = value;
  }

  const app = h(Root, { component: Component, props, slots });
  const html = await renderToString(app);

  return { html };
}

export default {
  renderToStaticMarkup,
  supportsAstroStaticSlot: true,
  check,
};
