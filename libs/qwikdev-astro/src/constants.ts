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
