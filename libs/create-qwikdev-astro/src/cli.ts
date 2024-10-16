#!/usr/bin/env node

import("./index.js").then((createQwikDevAstro) =>
  createQwikDevAstro.default(process.argv.slice(2))
);
