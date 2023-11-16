import { jsx } from "@builder.io/qwik";
import { renderToString } from "@builder.io/qwik/server";
import type { RendererContext } from "./types";
import { manifest } from "@qwik-client-manifest";
import { isDev } from "@builder.io/qwik/build";
import type {
  QwikManifest,
  SymbolMapper,
  SymbolMapperFn,
} from "@builder.io/qwik/optimizer";
import type { AstroUserConfig } from "astro";
import fs from 'node:fs';
import path from "node:path";
import { fileURLToPath } from "node:url";

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
  const resolveRoot = (cwd?: string | URL): string => {
    if (cwd instanceof URL) {
      cwd = fileURLToPath(cwd);
    }

    return cwd ? path.resolve(cwd) : process.cwd();
  };

  const resolveConfig = async (): Promise<AstroUserConfig> => {       
    const paths = [
      'astro.config.mjs',
      'astro.config.js',
      'astro.config.ts',
      'astro.config.mts',
      'astro.config.cjs',
      'astro.config.cts',
    ].map((p) => path.join(process.cwd(), p));

    for (const file of paths) {
      if (fs.existsSync(file)) {
        try {
          const configModule = await import(/* @vite-ignore */ file);
          return configModule.default || {};
        } catch (error) {
          console.error(error);
          throw error;
        }
      }
    }

    return {};
  }

  const userConfig = await resolveConfig();

  // Get the relative path
  // of the user-defined source directory
  const srcDir = path.relative(
    userConfig.root || resolveRoot(),
    userConfig.srcDir || "./src",
  );

  try {
    const slots: { [key: string]: any } = {};

    for (const [key, value] of Object.entries(slotted)) {
      slots[key] = jsx("span", {
        dangerouslySetInnerHTML: String(value),
        style: "display: contents",
      });
    }

    const app = jsx(Component, { props, children: slots.default });

    const symbolMapper: SymbolMapperFn = (
      symbolName: string,
      mapper: SymbolMapper | undefined
    ) => {
      return [symbolName, `/${srcDir}/${symbolName.toLocaleLowerCase()}.js`];
    };

    // TODO: `jsx` must correctly be imported.
    // Currently the vite loads `core.mjs` and `core.prod.mjs` at the same time and this causes issues.
    // WORKAROUND: ensure that `npm postinstall` is run to patch the `@builder.io/qwik/package.json` file.
    const result = await renderToString(app, {
      containerTagName: "div",
      containerAttributes: { style: "display: contents" },
      manifest: isDev ? ({} as QwikManifest) : manifest,
      symbolMapper: manifest ? undefined : symbolMapper,
      qwikLoader: { include: "never" },
    });

    // In dev mode we use the symbolMapper not the manifest, the empty object prevents a warning of a missing manifest. This should be fixed in Qwik core.

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
