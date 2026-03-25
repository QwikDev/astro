declare module "virtual:qwik-astro" {
  import type { RenderOptions } from "@qwik.dev/core/server";

  const renderOpts: RenderOptions;
  const clientRouter: boolean;
  export { renderOpts, clientRouter };
}
