import { describe, expect, it, vi } from "vitest";

vi.mock("virtual:qwikdev-astro", () => ({ renderOpts: {} }));
vi.mock("@qwik.dev/core/build", () => ({ isDev: false }));
vi.mock("@qwik.dev/core/server", () => ({ renderToStream: vi.fn() }));

const { default: renderer } = await import("../../server");

describe("check", () => {
  const ctx = { result: {} } as any;

  it("returns false for non-functions", async () => {
    expect(await renderer.check.call(ctx, "string")).toBe(false);
    expect(await renderer.check.call(ctx, 42)).toBe(false);
    expect(await renderer.check.call(ctx, null)).toBe(false);
    expect(await renderer.check.call(ctx, undefined)).toBe(false);
    expect(await renderer.check.call(ctx, {})).toBe(false);
  });
});
