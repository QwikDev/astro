import { h } from "@builder.io/qwik";
import { renderToString } from "@builder.io/qwik/server";
function check(Component, props, slotted) {
    try {
        if (typeof Component !== "function")
            return false;
        const { html } = renderToStaticMarkup.call(this, Component, props, slotted);
        console.log("End of check");
        return typeof html === "string";
    }
    catch (error) {
        console.error("Error in check:", error);
    }
}
export async function renderToStaticMarkup(Component, props, slotted) {
    try {
        const slots = {};
        for (const [key, value] of Object.entries(slotted)) {
            slots[key] = value;
        }
        const app = h(Component, { props, slots });
        const html = await renderToString(app);
        console.log("end of renderToStaticMarkup");
        console.log(html);
        return { html };
    }
    catch (error) {
        console.error("Error in renderToStaticMarkup:", error);
    }
}
export default {
    renderToStaticMarkup,
    supportsAstroStaticSlot: true,
    check,
};
