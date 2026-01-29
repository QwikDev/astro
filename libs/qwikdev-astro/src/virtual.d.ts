declare module "virtual:qwikdev-astro" {
  import type { RenderOptions } from "@builder.io/qwik/server";

  const renderOpts: RenderOptions;
  export { renderOpts };
}
