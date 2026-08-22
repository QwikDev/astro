import { describe, expect, it } from "vitest";
import { filterAstroPlugins } from "../../src/plugins";

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
