import type { RenderOptions } from "@qwik.dev/core/server";
import { z } from "astro/zod";
import { anyOf, createRegExp, exactly } from "magic-regexp";

export const INTEGRATION_NAME = "@qwikdev/astro";

export const SERVER_ENTRYPOINT = "@qwikdev/astro/server";
export const ROOT_ENTRYPOINT = "@qwikdev/astro/root";

export const VIRTUAL_MODULE_NAME = "virtual:qwikdev-astro";

export const VIRTUAL_MODULES = {
  "@qwik.dev/core/build": "\0@qwik.dev/core/build",
  "@qwik-client-manifest": "\0@qwik-client-manifest"
} as const;

export const QWIK_MODULES = ["@qwik.dev/core", "@qwik-client-manifest"] as const;

export const SCAN_EXTENSIONS = ["*.tsx", "*.jsx", "*.ts", "*.js"] as const;

export const QWIK_ENTRYPOINT_PATTERN = createRegExp(
  anyOf(
    exactly("@builder.io/qwik"),
    exactly("qwik.dev/core"),
    exactly("qwik.dev/react"),
    exactly(".qwik.")
  )
);

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
      .optional()
  })
  .optional();
