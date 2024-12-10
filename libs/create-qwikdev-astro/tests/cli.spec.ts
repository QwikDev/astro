import { test } from "@japa/runner";
import { name, version } from "../package.json";
import { Application } from "../src/app";
import { ProgramTester } from "../src/tester";

const app = new Application(name, version);
const tester = new ProgramTester(app);

test.group(`${name}@${version}`, () => {
  test("constructor", ({ assert }) => {
    assert.equal(app.name, name);
    assert.equal(app.version, version);
  });

  test("run", async ({ assert }) => {
    const result = await tester.run(["create qapp --yes"]);

    assert.isTrue(result.isSuccess());
  });
});
