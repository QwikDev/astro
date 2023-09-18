import { jsx as _jsx, jsxs as _jsxs } from "@builder.io/qwik/jsx-runtime";
/*
Qwik

The src/root.tsx file is the entry point for the application tree. It's the first component that will be rendered. It's the root of the tree.

*/
import { Slot, component$ } from "@builder.io/qwik";
export default component$(() => {
    return (_jsxs("div", { children: [_jsx(Slot, {}), "I'm inside astrojs-qwik root!"] }));
});
