import { describe, expect, it } from "vitest";
import { VIRTUAL_MODULES } from "../../src/constants";
import { createQwikBuildFixPlugin } from "../../src/plugins";

describe("createQwikBuildFixPlugin load", () => {
  function getPlugin(manifest: any = null) {
    return createQwikBuildFixPlugin(() => manifest) as any;
  }

  it("returns isServer=true, isBrowser=false for server environment", () => {
    const plugin = getPlugin();
    const result = plugin.load.call(
      { environment: { name: "server" } },
      VIRTUAL_MODULES["@qwik.dev/core/build"]
    );
    expect(result.code).toContain("export const isServer = true");
    expect(result.code).toContain("export const isBrowser = false");
  });

  it("returns isServer=false, isBrowser=true for client environment", () => {
    const plugin = getPlugin();
    const result = plugin.load.call(
      { environment: { name: "client" } },
      VIRTUAL_MODULES["@qwik.dev/core/build"]
    );
    expect(result.code).toContain("export const isServer = false");
    expect(result.code).toContain("export const isBrowser = true");
  });

  it("detects dev mode from environment.mode", () => {
    const plugin = getPlugin();
    const result = plugin.load.call(
      { environment: { name: "server", mode: "dev" } },
      VIRTUAL_MODULES["@qwik.dev/core/build"]
    );
    expect(result.code).toContain("export const isDev = true");
  });

  it("detects dev mode from environment.config.mode", () => {
    const plugin = getPlugin();
    const result = plugin.load.call(
      { environment: { name: "server", config: { mode: "development" } } },
      VIRTUAL_MODULES["@qwik.dev/core/build"]
    );
    expect(result.code).toContain("export const isDev = true");
  });

  it("returns isDev=false in production", () => {
    const plugin = getPlugin();
    const result = plugin.load.call(
      { environment: { name: "server", mode: "production" } },
      VIRTUAL_MODULES["@qwik.dev/core/build"]
    );
    expect(result.code).toContain("export const isDev = false");
  });
});
