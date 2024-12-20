import { test } from "@japa/runner";
import { name, version } from "../package.json";
import { Application, defaultDefinition } from "../src/app";
import { ProgramTester } from "../src/tester";
import { getPackageManager } from "../src/utils";

const app = new Application(name, version);
const tester = new ProgramTester(app);

test.group(`${name}@${version}`, () => {
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
    assert.isTrue(definition.get("destination").equals("."));
    assert.isTrue(definition.get("destination").equals(defaultDefinition.destination));
  });

  test("adapter", ({ assert }) => {
    assert.isTrue(definition.get("adapter").isUndefined());
    assert.isTrue(definition.get("adapter").equals(defaultDefinition.adapter));
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
    assert.isTrue(definition.get("destination").equals("."));
    assert.isTrue(definition.get("adapter").isUndefined());
  });

  test("one argument", ({ assert }) => {
    const definition = tester.parse(["qapp"]);
    assert.isTrue(definition.get("destination").isString());
    assert.isTrue(definition.get("destination").equals("qapp"));
    assert.isTrue(definition.get("adapter").isUndefined());
  });

  test("two arguments", ({ assert }) => {
    let definition = tester.parse(["my-qwik-astro-app", "node"]);
    assert.isTrue(definition.get("destination").equals("my-qwik-astro-app"));
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

test.group("interactions", () => {
  enum input {
    which_destination,
    use_adapter,
    which_adapter,
    biome,
    force,
    add,
    install,
    ci,
    git,
    package_name
  }

  const questions = {
    [input.which_destination]: "Where would you like to create your new project?",
    [input.use_adapter]: "Would you like to use a server adapter?",
    [input.which_adapter]: "Which adapter do you prefer?",
    [input.biome]: "Would you prefer Biome over ESLint/Prettier?",
    [input.force]: "What would you like to overwrite it?",
    [input.add]: "Do you want to add @QwikDev/astro to your existing project?",
    [input.install]: `Would you like to install ${getPackageManager()} dependencies?`,
    [input.ci]: "Would you like to add CI workflow?",
    [input.git]: "Would you like to initialize Git?",
    [input.package_name]: "What should be the name of this package?"
  } as const;

  const answers = {
    [input.which_destination]: [".", "my-qwik-astro-app"],
    [input.use_adapter]: [true, false],
    [input.which_adapter]: ["default", "node", "deno"],
    [input.biome]: [true, false],
    [input.force]: [true, false],
    [input.add]: [true, false],
    [input.install]: [true, false],
    [input.ci]: [true, false],
    [input.git]: [true, false],
    [input.package_name]: ["", "my-qwik-astro-app"]
  } as const;

  for (const [index, choices] of Object.entries(answers)) {
    for (const answer of choices) {
      const question = questions[index];

      test(`${question} ${answer}`, async ({ assert }) => {
        tester.intercept(question, answer);
        const parsed = tester.parse([]);
        const definition = await tester.interact(parsed.definition);

        switch (Number(index)) {
          case input.which_destination:
            assert.isTrue(definition.get("destination").equals(answer));
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
  }
});
