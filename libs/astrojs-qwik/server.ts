import { h } from "@builder.io/qwik";
import { renderToString } from "@builder.io/qwik/server";

export async function renderToStaticMarkup(Component, props, slotted) {
  const slots = {};
  for (const [key, value] of Object.entries(slotted)) {
    slots[key] = value;
  }
  const app = h(Component, { ...props, slots });
  const html = await renderToString(app);

  return { html };
}

export default {
  renderToStaticMarkup,
  supportsAstroStaticSlot: true,
};

/* 

I don't believe we need static-html.js or shouldComponentUpdate, Qwik views components as if they are static already. The listeners are themselves are the roots of the application.

https://www.builder.io/blog/hydration-tree-resumability-map#resumability-is-fundamentally-a-different-algorithm

*/
