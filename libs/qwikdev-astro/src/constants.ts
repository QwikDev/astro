import type { RenderOptions } from "@qwik.dev/core/server";
import { z } from "astro/zod";


export const INTEGRATION_NAME = "@qwik.dev/astro";

export const SERVER_ENTRYPOINT = "@qwik.dev/astro/server";
export const ROOT_ENTRYPOINT = "@qwik.dev/astro/root";

export const VIRTUAL_MODULE_NAME = "virtual:qwik-astro";

export const VIRTUAL_MODULES = {
  "@qwik-client-manifest": "\0@qwik-client-manifest"
} as const;

export const QWIK_MODULES = ["@qwik.dev/core", "@qwik-client-manifest"] as const;

export const SCAN_EXTENSIONS = ["*.tsx", "*.jsx", "*.ts", "*.js"] as const;

export const QWIK_ENTRYPOINT_PATTERN =
  /@builder\.io\/qwik|qwik\.dev\/core|qwik\.dev\/react|\.qwik\./;

export const FilterPatternSchema = z.union([
  z.string(),
  z.instanceof(RegExp),
  z.array(z.union([z.string(), z.instanceof(RegExp)])).readonly(),
  z.null()
]);

export const optionsSchema = z
  .object({
    /** Tell Qwik which files to process. */
    include: FilterPatternSchema.optional(),

    /** Tell Qwik which files to ignore. */
    exclude: FilterPatternSchema.optional(),

    /** Enable debug mode with the qwikVite plugin. */
    debug: z.boolean().optional(),

    /** Options passed into each Qwik component's `renderToStream` call. */
    renderOpts: z
      .custom<RenderOptions>((data) => {
        return typeof data === "object" && data !== null;
      })
      .optional(),

    /** Enable SPA-style navigation support with Astro's ClientRouter. */
    clientRouter: z.boolean().optional()
  })
  .optional();
