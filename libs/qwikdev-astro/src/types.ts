import type { AstroIntegration } from "astro";

// TODO: contributing this back to aik-mod where we export the type
export type DefineModuleOptions = {
  constExports?: Record<string, unknown>;
  defaultExport?: unknown;
};

export type SetupPropsWithAikMod = Parameters<
  NonNullable<AstroIntegration["hooks"]["astro:config:setup"]>
>[0] & {
  defineModule: (name: string, options: DefineModuleOptions) => string;
};
