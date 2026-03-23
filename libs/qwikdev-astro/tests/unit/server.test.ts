import { describe, expect, it, vi } from "vitest";

let mockClientRouter = false;

vi.mock("virtual:qwik-astro", () => ({
  renderOpts: {},
  get clientRouter() {
    return mockClientRouter;
  }
}));
vi.mock("@qwik.dev/core/build", () => ({ isDev: false }));
vi.mock("@qwik.dev/core", () => ({
  jsx: vi.fn((_tag: any, props: any) => ({ type: _tag, props }))
}));
vi.mock("@qwik.dev/core/internal", () => ({
  SSRComment: "SSRComment",
  jsx: vi.fn((_tag: any, props: any) => ({ type: _tag, props }))
}));
vi.mock("@qwik.dev/core/server", () => ({
  renderToStream: vi.fn(async (_jsx: any, opts: any) => {
    opts.stream.write("<div q:container>mock</div>");
  })
}));

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

describe("clientRouter script injection", () => {
  function makeCtx() {
    return { result: {} } as any;
  }

  function makeComponent() {
    const fn = function QwikComponent() {};
    const sym = Symbol("SERIALIZABLE_STATE");
    (fn as any)[sym] = [{}];
    return fn;
  }

  it("injects client router script when clientRouter is true", async () => {
    mockClientRouter = true;
    const ctx = makeCtx();
    const result = await renderer.renderToStaticMarkup.call(
      ctx,
      makeComponent(),
      {},
      {}
    );
    expect(result?.html).toContain("qwik-astro-client-router");
    expect(result?.html).toContain("astro:before-swap");
  });

  it("does not inject script when clientRouter is false", async () => {
    mockClientRouter = false;
    const ctx = makeCtx();
    const result = await renderer.renderToStaticMarkup.call(
      ctx,
      makeComponent(),
      {},
      {}
    );
    expect(result?.html).not.toContain("qwik-astro-client-router");
  });

  it("only injects script on the first container per page", async () => {
    mockClientRouter = true;
    const ctx = makeCtx();
    const component = makeComponent();

    const first = await renderer.renderToStaticMarkup.call(ctx, component, {}, {});
    const second = await renderer.renderToStaticMarkup.call(ctx, component, {}, {});

    expect(first?.html).toContain("qwik-astro-client-router");
    expect(second?.html).not.toContain("qwik-astro-client-router");
  });
});
