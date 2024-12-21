import app from "@qwikdev/create-astro/app";
import { describe, expect, it } from "vitest";

describe(`${app.name}@${app.version}`, () => {
  it("should create a new app", async () => {
    const result = await app.run(["pnpm", "create", "my-qwik-astro-app"]);

    expect(result).toBe(0);
  });
});
