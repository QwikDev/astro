import { test } from "@japa/runner";
import { name, version } from "../package.json";
import { Application, defaultDefinition } from "../src/app";
import { ProgramTester } from "../src/tester";

const app = new Application(name, version);
const tester = new ProgramTester(app);

test.group(`${name}@${version} API testing`, () => {
  test("constructor", ({ assert }) => {
    assert.equal(app.name, name);
    assert.equal(app.version, version);
  });

  test("default definition", ({ assert }) => {
    const definition = tester.parse([]);
    assert.isTrue(
      definition.has(
        "destination",
        "adapter",
        "force",
        "install",
        "biome",
        "git",
        "ci",
        "add"
      )
    );

    assert.isTrue(definition.get("destination").isString());
    assert.isTrue(definition.get("destination").equals("."));
    assert.isTrue(definition.get("destination").equals(defaultDefinition.destination));

    assert.isTrue(definition.get("adapter").isUndefined());
    assert.isTrue(definition.get("adapter").equals(defaultDefinition.adapter));

    assert.isTrue(definition.get("force").isUndefined());
    assert.isTrue(definition.get("force").equals(defaultDefinition.force));

    assert.isTrue(definition.get("install").isUndefined());
    assert.isTrue(definition.get("install").equals(defaultDefinition.install));

    assert.isTrue(definition.get("biome").isUndefined());
    assert.isTrue(definition.get("biome").equals(defaultDefinition.biome));

    assert.isTrue(definition.get("git").isUndefined());
    assert.isTrue(definition.get("git").equals(defaultDefinition.git));

    assert.isTrue(definition.get("ci").isUndefined());
    assert.isTrue(definition.get("ci").equals(defaultDefinition.ci));

    assert.isTrue(definition.get("add").isUndefined());
    assert.isTrue(definition.get("add").equals(defaultDefinition.add));
  });

  test("arguments", ({ assert }) => {
    let definition = tester.parse([]);
    assert.isTrue(definition.get("destination").isString());
    assert.isTrue(definition.get("destination").equals("."));
    assert.isTrue(definition.get("adapter").isUndefined());

    definition = tester.parse(["qapp"]);
    assert.isTrue(definition.get("destination").isString());
    assert.isTrue(definition.get("destination").equals("qapp"));
    assert.isTrue(definition.get("adapter").isUndefined());

    definition = tester.parse(["my-qwik-astro-app", "node"]);
    assert.isTrue(definition.get("destination").equals("my-qwik-astro-app"));
    assert.isTrue(definition.get("adapter").isString());
    assert.isTrue(definition.get("adapter").equals("node"));

    definition = tester.parse(["my-qwik-astro-app", "deno"]);
    assert.isTrue(definition.get("adapter").isString());
    assert.isTrue(definition.get("adapter").equals("deno"));
  });

  test("yes", ({ assert }) => {
    const definition = tester.parse(["--yes"]);
    assert.isTrue(definition.get("yes").isBoolean());
    assert.isTrue(definition.get("yes").isTrue());
  });

  test("no", ({ assert }) => {
    const definition = tester.parse(["--no"]);
    assert.isTrue(definition.get("no").isBoolean());
    assert.isTrue(definition.get("no").isTrue());
  });

  test("add", ({ assert }) => {
    const definition = tester.parse(["--add"]);
    assert.isTrue(definition.get("add").isBoolean());
    assert.isTrue(definition.get("add").isTrue());
  });

  test("force", ({ assert }) => {
    const definition = tester.parse(["--force"]);
    assert.isTrue(definition.get("force").isBoolean());
    assert.isTrue(definition.get("force").isTrue());
  });

  test("install", ({ assert }) => {
    const definition = tester.parse(["--install"]);
    assert.isTrue(definition.get("install").isBoolean());
    assert.isTrue(definition.get("install").isTrue());
  });

  test("biome", ({ assert }) => {
    const definition = tester.parse(["--biome"]);
    assert.isTrue(definition.get("biome").isBoolean());
    assert.isTrue(definition.get("biome").isTrue());
  });

  test("git", ({ assert }) => {
    const definition = tester.parse(["--git"]);
    assert.isTrue(definition.get("git").isBoolean());
    assert.isTrue(definition.get("git").isTrue());
  });

  test("ci", ({ assert }) => {
    const definition = tester.parse(["--ci"]);
    assert.isTrue(definition.get("ci").isBoolean());
    assert.isTrue(definition.get("ci").isTrue());
  });
});
