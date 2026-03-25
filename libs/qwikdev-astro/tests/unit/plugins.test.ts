import { describe, expect, it } from "vitest";
import { VIRTUAL_MODULES } from "../../src/constants";
import { createQwikManifestPlugin } from "../../src/plugins";

describe("createQwikManifestPlugin", () => {
  function getPlugin(manifest: any = null) {
    return createQwikManifestPlugin(() => manifest) as any;
  }

  it("resolves @qwik-client-manifest to virtual id", () => {
    const plugin = getPlugin();
    const resolved = plugin.resolveId("@qwik-client-manifest");
    expect(resolved).toBe(VIRTUAL_MODULES["@qwik-client-manifest"]);
  });

  it("returns undefined for unrelated ids", () => {
    const plugin = getPlugin();
    expect(plugin.resolveId("some-other-module")).toBeUndefined();
  });

  it("loads manifest as undefined when no manifest available", () => {
    const plugin = getPlugin(null);
    const result = plugin.load(VIRTUAL_MODULES["@qwik-client-manifest"]);
    expect(result.code).toContain("export const manifest = undefined");
  });

  it("loads manifest as JSON when manifest is available", () => {
    const manifest = { symbols: {}, mapping: {} };
    const plugin = getPlugin(manifest);
    const result = plugin.load(VIRTUAL_MODULES["@qwik-client-manifest"]);
    expect(result.code).toContain("export const manifest = ");
    expect(result.code).not.toContain("undefined");
  });

  it("returns undefined for unrelated load ids", () => {
    const plugin = getPlugin();
    expect(plugin.load("some-other-id")).toBeUndefined();
  });
});
