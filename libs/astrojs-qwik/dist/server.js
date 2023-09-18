import { h } from "@builder.io/qwik";
import { renderToString } from "@builder.io/qwik/server";
import Root from "./root";
function check(Component, props, slotted) {
    console.log("Inside check");
    if (typeof Component !== "function")
        return false;
    const { html } = renderToStaticMarkup.call(this, Component, props, slotted);
    return typeof html === "string";
}
export async function renderToStaticMarkup(Component, props, slotted) {
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
