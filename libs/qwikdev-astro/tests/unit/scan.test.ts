import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  createQwikFileFilter,
  resolveQwikPaths,
  scanQwikEntrypoints
} from "../../src/scan";

describe("resolveQwikPaths", () => {
  function makeConfig(overrides: { adapter?: { name: string } } = {}) {
    return {
      root: new URL("file:///project/"),
      srcDir: new URL("file:///project/src/"),
      outDir: new URL("file:///project/dist/"),
      build: {
        client: new URL("file:///project/dist/client/"),
        server: new URL("file:///project/dist/server/")
      },
      adapter: overrides.adapter ?? null
    } as any;
  }

  it("resolves paths for static output (no adapter)", () => {
    const result = resolveQwikPaths(makeConfig());
    expect(result.srcDir).toBe("src");
    expect(result.serverDir).toBe("dist/server");
    expect(result.finalDir).toBe("dist");
  });

  it("resolves paths with an adapter", () => {
    const result = resolveQwikPaths(makeConfig({ adapter: { name: "node" } }));
    expect(result.finalDir).toBe("dist/client");
  });

  it("handles vercel adapter specially", () => {
    const result = resolveQwikPaths(makeConfig({ adapter: { name: "@astrojs/vercel" } }));
    expect(result.finalDir).toContain("dist");
  });
});

describe("scanQwikEntrypoints", () => {
  let root: string;

  beforeEach(() => {
    root = mkdtempSync(join(tmpdir(), "qwik-astro-scan-"));
    mkdirSync(join(root, "src"));
    mkdirSync(join(root, "node_modules", "dep"), { recursive: true });
    writeFileSync(
      join(root, "src", "counter.tsx"),
      'import { component$ } from "@qwik.dev/core";\n'
    );
    writeFileSync(join(root, "src", "plain.tsx"), "export const x = 1;\n");
    writeFileSync(
      join(root, "node_modules", "dep", "index.js"),
      'require("@qwik.dev/core");\n'
    );
  });

  afterEach(() => {
    rmSync(root, { recursive: true, force: true });
  });

  it("finds entrypoints as native absolute paths from a file URL root", async () => {
    const config = { root: pathToFileURL(`${root}/`) } as any;
    const entrypoints = await scanQwikEntrypoints(config, () => true);
    expect([...entrypoints]).toEqual([join(root, "src", "counter.tsx")]);
  });

  it("respects the filter", async () => {
    const config = { root: pathToFileURL(`${root}/`) } as any;
    const entrypoints = await scanQwikEntrypoints(config, () => false);
    expect(entrypoints.size).toBe(0);
  });
});

describe("createQwikFileFilter", () => {
  it("always returns true for non-transform hooks", () => {
    const filter = createQwikFileFilter(() => true);
    expect(filter("anything.ts", "resolveId")).toBe(true);
    expect(filter("anything.ts", "load")).toBe(true);
  });

  it("returns true for .qwik. files on transform hook regardless of filter", () => {
    const filter = createQwikFileFilter(() => false);
    expect(filter("component.qwik.tsx", "transform")).toBe(true);
  });

  it("delegates to filter function for transform hook on non-.qwik. files", () => {
    const allow = createQwikFileFilter(() => true);
    const deny = createQwikFileFilter(() => false);
    expect(allow("component.tsx", "transform")).toBe(true);
    expect(deny("component.tsx", "transform")).toBe(false);
  });
});
