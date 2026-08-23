import { describe, expect, it } from "vitest";
import { filterAstroPlugins, stripClientOutputHooks } from "../../src/plugins";

describe("stripClientOutputHooks", () => {
  it("removes Qwik client output hooks from Astro builds", () => {
    const plugins = [
      { name: "vite-plugin-qwik", outputOptions: () => undefined },
      { name: "vite-plugin-qwik-post", generateBundle: () => undefined },
      { name: "user-plugin", generateBundle: () => undefined }
    ];

    stripClientOutputHooks(plugins);

    expect(plugins[0]).not.toHaveProperty("outputOptions");
    expect(plugins[1]).not.toHaveProperty("generateBundle");
    expect(plugins[2]).toHaveProperty("generateBundle");
  });
});

describe("filterAstroPlugins", () => {
  it("excludes Astro's transition plugin from the standalone Qwik build", () => {
    const plugins = filterAstroPlugins([
      { name: "astro:transitions" },
      { name: "virtual:test" },
      { name: "user-plugin" }
    ]);

    expect(plugins.map((plugin) => plugin.name)).toEqual(["virtual:test", "user-plugin"]);
  });
});
