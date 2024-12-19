import createQwikAstroProject from "@qwikdev/create-astro";
import { expect, it } from "vitest";

it("should run with no args", async () => {
  const project = await createQwikAstroProject();
  expect(project).toBe(true);
});
