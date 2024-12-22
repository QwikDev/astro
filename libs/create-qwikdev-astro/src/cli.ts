#!/usr/bin/env node

import("./index.js").then(
  (createQwikDevAstro): Promise<number> => createQwikDevAstro.default()
);
