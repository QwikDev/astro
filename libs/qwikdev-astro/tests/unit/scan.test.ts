import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { afterEach, describe, expect, it } from "vitest";
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
  let dir: string;

  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  async function makeProject(files: Record<string, string>) {
    dir = await mkdtemp(join(tmpdir(), "qwik-scan-"));
    for (const [path, content] of Object.entries(files)) {
      await mkdir(join(dir, ...path.split("/").slice(0, -1)), { recursive: true });
      await writeFile(join(dir, ...path.split("/")), content);
    }
    return { root: pathToFileURL(`${dir}/`) } as any;
  }

  it("finds files importing qwik", async () => {
    const config = await makeProject({
      "src/counter.tsx": `import { component$ } from "@qwik.dev/core";`,
      "src/plain.tsx": `export const plain = true;`
    });
    const entrypoints = await scanQwikEntrypoints(config, () => true);
    expect([...entrypoints]).toEqual([join(dir, "src", "counter.tsx")]);
  });

  it("ignores node_modules and respects the filter", async () => {
    const config = await makeProject({
      "node_modules/lib/index.ts": `import { component$ } from "@qwik.dev/core";`,
      "src/excluded.tsx": `import { component$ } from "@qwik.dev/core";`
    });
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
