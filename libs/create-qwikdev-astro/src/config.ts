export type Config = {
  project: string;
  adapter?: "deno" | "node";
  force: boolean;
  install: boolean;
  biome: boolean;
  git: boolean;
  ci: boolean;
  it: boolean;
  yes: boolean;
  no: boolean;
  dryRun: boolean;
};

export type UserConfig = Partial<Config>;

export const defaultConfig = {
  project: "./qwik-astro-astro",
  adapter: undefined,
  force: false,
  install: true,
  biome: true,
  git: false,
  ci: false,
  it: false,
  yes: false,
  no: false,
  dryRun: false
} as const;

export type Adapter = "node" | "deno" | "default";

export function defineConfig(config: UserConfig): Config {
  return { ...defaultConfig, ...config };
}
