import { jsx as _jsx } from "@builder.io/qwik/jsx-runtime";
/*
 * WHAT IS THIS FILE?
 *
 * Development entry point for Qwik using only client-side modules:
 * - Do not use this mode in production!
 * - No SSR
 * - No portion of the application is pre-rendered on the server.
 * - All of the application is running eagerly in the browser.
 * - More code is transferred to the browser than in SSR mode.
 * - Optimizer/Serialization/Deserialization code is not exercised!
 */
import { render } from "@builder.io/qwik";
import Root from "./root";
export default function (opts) {
    return render(document, _jsx(Root, {}), opts);
}
