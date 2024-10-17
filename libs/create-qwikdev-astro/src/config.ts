export type Config = {
  project: string;
  adapter?: "deno" | "node";
  force?: boolean;
  install?: boolean;
  biome?: boolean;
  git?: boolean;
  ci?: boolean;
  it?: boolean;
  yes?: boolean;
  no?: boolean;
  dryRun?: boolean;
};

export type UserConfig = Partial<Config>;

export const defaultConfig = {
  project: ".",
  adapter: undefined,
  force: undefined,
  install: undefined,
  biome: undefined,
  git: undefined,
  ci: undefined,
  it: undefined,
  yes: undefined,
  no: undefined,
  dryRun: undefined
} as const;

export type Adapter = "node" | "deno" | "default";

export function defineConfig(config: UserConfig): Config {
  return { ...defaultConfig, ...config };
}
