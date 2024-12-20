/** @type {import("prettier").Config} */
module.default = {
  plugins: ["prettier-plugin-astro"],
  quoteProps: "consistent",
  bracketSpacing: true,
  arrowParens: "always",
  jsdocPreferCodeFences: true,
  tsdoc: true,
  trailingComma: "es5",
  tabWidth: 2,
  semi: true,
  singleQuote: true,
  printWidth: 100,
  useTabs: false,
  overrides: [
    {
      files: "*.astro",
      options: {
        parser: "astro",
      },
    },
  ],
};
