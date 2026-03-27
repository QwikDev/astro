import type { Assert } from "@japa/assert";
import { test } from "@japa/runner";
import { name, version } from "@qwik.dev/create-astro/package.json";
import app, { defaultDefinition } from "../src/app.js";
import { ProgramTester } from "../src/tester.js";

declare module "@japa/runner/core" {
  interface TestContext {
    assert: Assert;
  }
}

process.env.NODE_ENV = "test";
process.env.CI = "1";

const tester = new ProgramTester(app);
const projectName = "my-qwik-astro-app";

enum input {
  which_destination,
  how_to_start,
  which_template,
  add,
  force,
  copy,
  biome,
  install,
  git,
  ci
}

const questions = {
  [input.which_destination]: "Where would you like to create your new project?",
  [input.how_to_start]: "How would you like to start?",
  [input.which_template]: "Which Astro template?",
  [input.add]: "Do you want to add @qwik.dev/astro to your existing project?",
  [input.force]: "Would you like to force the copy?",
  [input.copy]: "Copy template files safely (without overwriting existing files)?",
  [input.biome]: "Would you prefer Biome over ESLint/Prettier?",
  [input.install]: `Would you like to install .* dependencies?`,
  [input.git]: "Would you like to initialize Git?",
  [input.ci]: "Would you like to add CI workflow?"
} as const;

const answers = {
  [input.which_destination]: [".", projectName],
  [input.how_to_start]: ["none", "node", "deno", "template"],
  [input.which_template]: ["minimal", "blog"],
  [input.add]: [true, false],
  [input.force]: [true, false],
  [input.copy]: [true, false],
  [input.biome]: [true, false],
  [input.install]: [true, false],
  [input.git]: [true, false],
  [input.ci]: [true, false]
} as const;

test.group(`${name}@${version} API`, () => {
  test("constructor", ({ assert }) => {
    assert.equal(app.name, name);
    assert.equal(app.version, version);
  });
});

test.group("default definition", () => {
  const definition = tester.parse([]);

  test("keys", ({ assert }) => {
    assert.isTrue(
      definition.has(
        "destination",
        "adapter",
        "template",
        "add",
        "force",
        "copy",
        "install",
        "biome",
        "git",
        "ci"
      )
    );
  });

  test("destination", ({ assert }) => {
    assert.isTrue(definition.get("destination").isString());
    assert.isTrue(definition.get("destination").equals("./qwik-astro-app"));
    assert.isTrue(definition.get("destination").equals(defaultDefinition.destination));
  });

  test("adapter", ({ assert }) => {
    assert.isTrue(definition.get("adapter").isString());
    assert.isTrue(definition.get("adapter").equals("none"));
    assert.isTrue(definition.get("adapter").equals(defaultDefinition.adapter));
  });

  test("template", ({ assert }) => {
    assert.isTrue(definition.get("template").isUndefined());
    assert.isTrue(definition.get("template").equals(defaultDefinition.template));
  });

  test("add", ({ assert }) => {
    assert.isTrue(definition.get("add").isUndefined());
    assert.isTrue(definition.get("add").equals(defaultDefinition.add));
  });

  test("force", ({ assert }) => {
    assert.isTrue(definition.get("force").isUndefined());
    assert.isTrue(definition.get("force").equals(defaultDefinition.force));
  });

  test("copy", ({ assert }) => {
    assert.isTrue(definition.get("copy").isUndefined());
    assert.isTrue(definition.get("copy").equals(defaultDefinition.copy));
  });

  test("install", ({ assert }) => {
    assert.isTrue(definition.get("install").isUndefined());
    assert.isTrue(definition.get("install").equals(defaultDefinition.install));
  });

  test("biome", ({ assert }) => {
    assert.isTrue(definition.get("biome").isUndefined());
    assert.isTrue(definition.get("biome").equals(defaultDefinition.biome));
  });

  test("git", ({ assert }) => {
    assert.isTrue(definition.get("git").isUndefined());
    assert.isTrue(definition.get("git").equals(defaultDefinition.git));
  });

  test("ci", ({ assert }) => {
    assert.isTrue(definition.get("ci").isUndefined());
    assert.isTrue(definition.get("ci").equals(defaultDefinition.ci));
  });
});

test.group("arguments", () => {
  test("no argument", ({ assert }) => {
    let definition = tester.parse([]);

    assert.isTrue(definition.get("destination").isString());
    assert.isTrue(definition.get("destination").equals("./qwik-astro-app"));
    assert.isTrue(definition.get("adapter").equals("none"));
  });

  test("one argument", ({ assert }) => {
    const definition = tester.parse([projectName]);
    assert.isTrue(definition.get("destination").isString());
    assert.isTrue(definition.get("destination").equals(projectName));
    assert.isTrue(definition.get("adapter").equals("none"));
  });

  test("two arguments", ({ assert }) => {
    let definition = tester.parse([projectName, "node"]);
    assert.isTrue(definition.get("destination").equals(projectName));
    assert.isTrue(definition.get("adapter").isString());
    assert.isTrue(definition.get("adapter").equals("node"));

    definition = tester.parse(["my-qwik-astro-app", "deno"]);
    assert.isTrue(definition.get("adapter").isString());
    assert.isTrue(definition.get("adapter").equals("deno"));
  });

  test("template argument", ({ assert }) => {
    let definition = tester.parse([projectName, "--template", "minimal"]);
    assert.isTrue(definition.get("template").isString());
    assert.isTrue(definition.get("template").equals("minimal"));

    definition = tester.parse(["my-qwik-astro-app", "--template", "blog"]);
    assert.isTrue(definition.get("template").equals("blog"));
  });
});

test.group("options", () => {
  test("yes", ({ assert }) => {
    let definition = tester.parse(["--yes"]);
    assert.isTrue(definition.get("yes").isBoolean());
    assert.isTrue(definition.get("yes").isTrue());
    assert.isTrue(definition.get("y").isBoolean());
    assert.isTrue(definition.get("y").isTrue());

    definition = tester.parse(["--no-yes"]);
    assert.isTrue(definition.get("yes").isBoolean());
    assert.isTrue(definition.get("yes").isFalse());
    assert.isTrue(definition.get("y").isBoolean());
    assert.isTrue(definition.get("y").isFalse());
  });

  test("no", ({ assert }) => {
    let definition = tester.parse(["--no"]);
    assert.isTrue(definition.get("no").isBoolean());
    assert.isTrue(definition.get("no").isTrue());
    assert.isTrue(definition.get("n").isBoolean());
    assert.isTrue(definition.get("n").isTrue());

    definition = tester.parse(["--no-no"]);
    assert.isTrue(definition.get("no").isBoolean());
    assert.isTrue(definition.get("no").isFalse());
    assert.isTrue(definition.get("n").isBoolean());
    assert.isTrue(definition.get("n").isFalse());
  });

  test("add", ({ assert }) => {
    let definition = tester.parse(["--add"]);
    assert.isTrue(definition.get("add").isBoolean());
    assert.isTrue(definition.get("add").isTrue());
    assert.isTrue(definition.get("a").isBoolean());
    assert.isTrue(definition.get("a").isTrue());

    definition = tester.parse(["--no-add"]);
    assert.isTrue(definition.get("add").isBoolean());
    assert.isTrue(definition.get("add").isFalse());
    assert.isTrue(definition.get("a").isBoolean());
    assert.isTrue(definition.get("a").isFalse());
  });

  test("force", ({ assert }) => {
    let definition = tester.parse(["--force"]);
    assert.isTrue(definition.get("force").isBoolean());
    assert.isTrue(definition.get("force").isTrue());
    assert.isTrue(definition.get("f").isBoolean());
    assert.isTrue(definition.get("f").isTrue());

    definition = tester.parse(["--no-force"]);
    assert.isTrue(definition.get("force").isBoolean());
    assert.isTrue(definition.get("force").isFalse());
    assert.isTrue(definition.get("f").isBoolean());
    assert.isTrue(definition.get("f").isFalse());
  });

  test("copy", ({ assert }) => {
    let definition = tester.parse(["--copy"]);
    assert.isTrue(definition.get("copy").isBoolean());
    assert.isTrue(definition.get("copy").isTrue());
    assert.isTrue(definition.get("c").isBoolean());
    assert.isTrue(definition.get("c").isTrue());

    definition = tester.parse(["--no-copy"]);
    assert.isTrue(definition.get("copy").isBoolean());
    assert.isTrue(definition.get("copy").isFalse());
    assert.isTrue(definition.get("c").isBoolean());
    assert.isTrue(definition.get("c").isFalse());
  });

  test("install", ({ assert }) => {
    let definition = tester.parse(["--install"]);
    assert.isTrue(definition.get("install").isBoolean());
    assert.isTrue(definition.get("install").isTrue());
    assert.isTrue(definition.get("i").isBoolean());
    assert.isTrue(definition.get("i").isTrue());

    definition = tester.parse(["--no-install"]);
    assert.isTrue(definition.get("install").isBoolean());
    assert.isTrue(definition.get("install").isFalse());
    assert.isTrue(definition.get("i").isBoolean());
    assert.isTrue(definition.get("i").isFalse());
  });

  test("biome", ({ assert }) => {
    let definition = tester.parse(["--biome"]);
    assert.isTrue(definition.get("biome").isBoolean());
    assert.isTrue(definition.get("biome").isTrue());

    definition = tester.parse(["--no-biome"]);
    assert.isTrue(definition.get("biome").isBoolean());
    assert.isTrue(definition.get("biome").isFalse());
  });

  test("git", ({ assert }) => {
    let definition = tester.parse(["--git"]);
    assert.isTrue(definition.get("git").isBoolean());
    assert.isTrue(definition.get("git").isTrue());

    definition = tester.parse(["--no-git"]);
    assert.isTrue(definition.get("git").isBoolean());
    assert.isTrue(definition.get("git").isFalse());
  });

  test("ci", ({ assert }) => {
    let definition = tester.parse(["--ci"]);
    assert.isTrue(definition.get("ci").isBoolean());
    assert.isTrue(definition.get("ci").isTrue());

    definition = tester.parse(["--no-ci"]);
    assert.isTrue(definition.get("ci").isBoolean());
    assert.isTrue(definition.get("ci").isFalse());
  });
});

test.group("aliases", () => {
  test("y", ({ assert }) => {
    let definition = tester.parse(["-y"]);
    assert.isTrue(definition.get("yes").isBoolean());
    assert.isTrue(definition.get("yes").isTrue());
    assert.isTrue(definition.get("y").isBoolean());
    assert.isTrue(definition.get("y").isTrue());

    definition = tester.parse(["--no-y"]);
    assert.isTrue(definition.get("yes").isBoolean());
    assert.isTrue(definition.get("yes").isFalse());
    assert.isTrue(definition.get("y").isBoolean());
    assert.isTrue(definition.get("y").isFalse());
  });

  test("n", ({ assert }) => {
    let definition = tester.parse(["-n"]);
    assert.isTrue(definition.get("no").isBoolean());
    assert.isTrue(definition.get("no").isTrue());
    assert.isTrue(definition.get("n").isBoolean());
    assert.isTrue(definition.get("n").isTrue());

    definition = tester.parse(["--no-n"]);
    assert.isTrue(definition.get("no").isBoolean());
    assert.isTrue(definition.get("no").isFalse());
    assert.isTrue(definition.get("n").isBoolean());
    assert.isTrue(definition.get("n").isFalse());
  });

  test("a", ({ assert }) => {
    let definition = tester.parse(["-a"]);
    assert.isTrue(definition.get("add").isBoolean());
    assert.isTrue(definition.get("add").isTrue());
    assert.isTrue(definition.get("a").isBoolean());
    assert.isTrue(definition.get("a").isTrue());

    definition = tester.parse(["--no-a"]);
    assert.isTrue(definition.get("add").isBoolean());
    assert.isTrue(definition.get("add").isFalse());
    assert.isTrue(definition.get("a").isBoolean());
    assert.isTrue(definition.get("a").isFalse());
  });

  test("f", ({ assert }) => {
    let definition = tester.parse(["-f"]);
    assert.isTrue(definition.get("force").isBoolean());
    assert.isTrue(definition.get("force").isTrue());
    assert.isTrue(definition.get("f").isBoolean());
    assert.isTrue(definition.get("f").isTrue());

    definition = tester.parse(["--no-f"]);
    assert.isTrue(definition.get("force").isBoolean());
    assert.isTrue(definition.get("force").isFalse());
    assert.isTrue(definition.get("f").isBoolean());
    assert.isTrue(definition.get("f").isFalse());
  });

  test("c", ({ assert }) => {
    let definition = tester.parse(["-c"]);
    assert.isTrue(definition.get("copy").isBoolean());
    assert.isTrue(definition.get("copy").isTrue());
    assert.isTrue(definition.get("c").isBoolean());
    assert.isTrue(definition.get("c").isTrue());

    definition = tester.parse(["--no-c"]);
    assert.isTrue(definition.get("copy").isBoolean());
    assert.isTrue(definition.get("copy").isFalse());
    assert.isTrue(definition.get("c").isBoolean());
    assert.isTrue(definition.get("c").isFalse());
  });

  test("i", ({ assert }) => {
    let definition = tester.parse(["-i"]);
    assert.isTrue(definition.get("install").isBoolean());
    assert.isTrue(definition.get("install").isTrue());
    assert.isTrue(definition.get("i").isBoolean());
    assert.isTrue(definition.get("i").isTrue());

    definition = tester.parse(["--no-i"]);
    assert.isTrue(definition.get("install").isBoolean());
    assert.isTrue(definition.get("install").isFalse());
    assert.isTrue(definition.get("i").isBoolean());
    assert.isTrue(definition.get("i").isFalse());
  });
});

for (const [key, choices] of Object.entries(answers)) {
  const index = Number(key) as input;
  const question = questions[index];

  test.group(`${question}`, () => {
    for (const answer of choices) {
      test(`${answer}`, async ({ assert }) => {
        tester.intercept(question, answer);
        const parsed = tester.parse(
          index === input.which_destination ? [] : [projectName]
        );
        const definition = await tester.interact(parsed.definition);
        switch (index) {
          case input.which_destination:
            assert.isTrue(definition.get("destination").equals(answer));
            break;

          case input.how_to_start:
            if (answer === "template") {
              assert.isTrue(definition.get("template").equals("minimal"));
            } else {
              assert.isTrue(definition.get("adapter").equals(answer));
            }
            break;

          case input.which_template:
            assert.isTrue(definition.get("template").equals(answer));
            break;

          case input.biome:
            assert.isTrue(definition.get("biome").equals(answer));
            break;

          case input.install:
            if (
              definition.get("template").isString() &&
              !definition.get("template").equals("")
            ) {
              assert.isTrue(definition.get("install").isTrue());
            } else {
              assert.isTrue(definition.get("install").equals(answer));
            }
            break;

          case input.git:
            assert.isTrue(definition.get("git").equals(answer));
            break;

          case input.ci:
            assert.isTrue(definition.get("ci").equals(answer));
            break;
        }
      });
    }
  });
}
