import type { SSRResult } from "astro";

import { type JSXNode, jsx } from "@builder.io/qwik";
import type { QwikManifest, SymbolMapperFn } from "@builder.io/qwik/optimizer";

import { isDev } from "@builder.io/qwik/build";
import { getQwikLoaderScript, renderToString } from "@builder.io/qwik/server";
import { manifest } from "@qwik-client-manifest";

const qwikLoaderAdded = new WeakMap<SSRResult, boolean>();

type RendererContext = {
  result: SSRResult;
};

async function check(this: RendererContext, component: unknown) {
  try {
    if (typeof component !== "function") {
      return false;
    }

    if (component.name !== "QwikComponent") {
      return false;
    }

    return true;
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
    if (component.name !== "QwikComponent") {
      return;
    }

    const slots: { [key: string]: unknown } = {};
    let defaultSlot: JSXNode<"span"> | undefined = undefined;

    // getting functions from index causes a rollup issue.
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

    const slotValues = Object.values(slotted);
    const app = jsx(component, {
      ...props,
      children: defaultSlot ? [defaultSlot, ...slotValues] : [...slotValues]
    });

    /**
      For a given symbol (QRL such as `onKeydown$`) the server needs to know which bundle the symbol is in. 

      Normally this is provided by Qwik's `q-manifest` . But `q-manifest` only exists after a full client build. 

      This would be a problem in dev mode. So in dev mode the symbol is mapped to the expected URL using the symbolMapper function above. For Vite the given path is fixed for a given symbol.
    */
    const symbolMapper: SymbolMapperFn = (symbolName: string) => {
      /* don't want to add a file path for sync$ */
      if (symbolName === "<sync>") {
        return;
      }

      return [symbolName, `/${process.env.SRC_DIR}/${symbolName.toLocaleLowerCase()}.js`];
    };

    const shouldAddQwikLoader = !qwikLoaderAdded.has(this.result);
    if (shouldAddQwikLoader) {
      qwikLoaderAdded.set(this.result, true);
    }

    const base = (props["q:base"] || process.env.Q_BASE) as string;

    // TODO: `jsx` must correctly be imported.
    // Currently the vite loads `core.mjs` and `core.prod.mjs` at the same time and this causes issues.
    // WORKAROUND: ensure that `npm postinstall` is run to patch the `@builder.io/qwik/package.json` file.
    const result = await renderToString(app, {
      base,
      containerTagName: "div",
      containerAttributes: { style: "display: contents" },
      manifest: isDev ? ({} as QwikManifest) : manifest,
      ...(manifest ? undefined : { symbolMapper }),
      qwikLoader: { include: "never" }
    });

    const prefetchServiceWorker = `((qc, c, q, v, b, h) => {
      b = qc.getAttribute("q:base");
      h = qc.getAttribute("q:manifest-hash");
      c.register("/qwik-prefetch-service-worker.js", {
        scope: "/"
      }).then((sw, onReady) => {
        onReady = () => q.forEach(q.push = (v2) => sw.active.postMessage(v2));
        sw.installing ? sw.installing.addEventListener("statechange", (e) => e.target.state == "activated" && onReady()) : onReady();
      });
      v && q.push([
        "verbose"
      ]);
      document.addEventListener("qprefetch", (e) => e.detail.bundles && q.push([
        "prefetch",
          b,
          ...e.detail.bundles
        ]));
      })(
    document.currentScript.closest('[q\\\\:container]'),
    navigator.serviceWorker,
    window.qwikPrefetchSW||(window.qwikPrefetchSW=[])
    )`;

    const prefetchGraphCode = `((qc, q, b, h, u) => {
      q.push([
        "graph-url", 
        b || qc.getAttribute("q:base"),
        u || \`q-bundle-graph-\${h || qc.getAttribute("q:manifest-hash")}.json\`
       ]);
    })(
     document.currentScript.closest('[q\\\\:container]'),
     window.qwikPrefetchSW||(window.qwikPrefetchSW=[]),
    )`;

    const { html } = result;

    /* Inlining the necessary Qwik scripts for the Qwikloader & SW */
    let scripts = "";

    const shouldPrefetchBundles =
      html.indexOf('<script q:type="prefetch-bundles">') !== -1;

    if (shouldAddQwikLoader) {
      scripts += `
        <script qwik-loader>
          ${getQwikLoaderScript()}
        </script>
        ${
          isDev
            ? ""
            : `
        <script qwik-prefetch-service-worker>
        ${prefetchServiceWorker}
        </script>
        `
        }
      ${scripts}`;
    }

    if (!isDev && shouldPrefetchBundles) {
      scripts += `<script qwik-prefetch-bundle-graph>
      ${prefetchGraphCode}
    </script>`;
    }

    // Find the closing tag of the div with the `q:container` attribute
    const prefetchBundleLoc = shouldPrefetchBundles
      ? html.indexOf('<script q:type="prefetch-bundles">')
      : html.indexOf('<script type="qwik/json"');

    // Insert the scripts before the q:type prefetch bundle script
    const htmlWithScripts = `${html.substring(
      0,
      prefetchBundleLoc
    )}${scripts}${html.substring(prefetchBundleLoc)}`;

    return {
      ...result,
      html: htmlWithScripts
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
