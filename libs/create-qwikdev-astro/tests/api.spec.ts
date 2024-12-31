import { test } from "@japa/runner";
import app, { defaultDefinition } from "@qwikdev/create-astro/app";
import { name, version } from "@qwikdev/create-astro/package.json";
import { ProgramTester } from "@qwikdev/create-astro/tester";
import { getPackageManager } from "@qwikdev/create-astro/utils";

process.env.NODE_ENV = "test";
process.env.CI = "1";

const tester = new ProgramTester(app);
const projectName = "my-qwik-astro-app";

enum input {
  which_destination,
  use_adapter,
  which_adapter,
  biome,
  install,
  ci,
  git,
  add,
  force,
  package_name
}

const questions = {
  [input.which_destination]: "Where would you like to create your new project?",
  [input.use_adapter]: "Would you like to use a server adapter?",
  [input.which_adapter]: "Which adapter do you prefer?",
  [input.biome]: "Would you prefer Biome over ESLint/Prettier?",
  [input.install]: `Would you like to install ${getPackageManager()} dependencies?`,
  [input.ci]: "Would you like to add CI workflow?",
  [input.git]: "Would you like to initialize Git?",
  [input.add]: "Do you want to add @QwikDev/astro to your existing project?",
  [input.force]: "What would you like to overwrite it?",
  [input.package_name]: "What should be the name of this package?"
} as const;

const answers = {
  [input.which_destination]: [".", projectName],
  [input.use_adapter]: [true, false],
  [input.which_adapter]: ["none", "node", "deno"],
  [input.biome]: [true, false],
  [input.install]: [true, false],
  [input.ci]: [true, false],
  [input.git]: [true, false],
  [input.add]: [true, false],
  [input.force]: [true, false],
  [input.package_name]: [projectName, ""]
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
        "force",
        "install",
        "biome",
        "git",
        "ci",
        "add"
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

  test("force", ({ assert }) => {
    assert.isTrue(definition.get("force").isUndefined());
    assert.isTrue(definition.get("force").equals(defaultDefinition.force));
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

  test("add", ({ assert }) => {
    assert.isTrue(definition.get("add").isUndefined());
    assert.isTrue(definition.get("add").equals(defaultDefinition.add));
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
  const index = Number(key);
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

          case input.which_adapter:
            if (
              (
                await tester.scanBoolean(parsed.definition, questions[input.use_adapter])
              ).isTrue()
            ) {
              assert.isTrue(definition.get("adapter").equals(answer));
            }
            break;

          case input.biome:
            assert.isTrue(definition.get("biome").equals(answer));
            break;

          case input.install:
            assert.isTrue(definition.get("install").equals(answer));
            break;

          case input.ci:
            assert.isTrue(definition.get("ci").equals(answer));
            break;
          case input.git:
            assert.isTrue(definition.get("git").equals(answer));
            break;
        }
      });
    }
  });
}
