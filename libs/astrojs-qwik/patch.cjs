const fs = require("fs");
PKG = "./node_modules/@builder.io/qwik/package.json";
const packageJson = JSON.parse(fs.readFileSync(PKG, "utf8"));
packageJson.exports["."].import.default = "./core.mjs";
packageJson.exports["."].require.default = "./core.mjs";
fs.writeFileSync(PKG, JSON.stringify(packageJson, null, 2));
