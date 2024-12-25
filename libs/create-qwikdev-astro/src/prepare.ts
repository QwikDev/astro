import { existsSync, readdirSync, renameSync } from "node:fs";
import { dirname, join } from "node:path";
import { logError, logInfo, logSuccess } from "./console";
import { __dirname } from "./utils";

function renameGitignore(dir: string, restore = false) {
  const files = readdirSync(dir, { withFileTypes: true });

  for (const file of files) {
    const filePath = join(dir, file.name);

    if (file.isDirectory()) {
      renameGitignore(filePath, restore);
    } else if (file.name === (restore ? ".gitignore" : "gitignore")) {
      const newName = join(dir, restore ? "gitignore" : ".gitignore");
      renameSync(filePath, newName);
      logSuccess(`Renamed "${filePath}" to "${newName}"`);
    }
  }
}

const templates = join(dirname(__dirname), "stubs", "templates");
const restore = process.argv.includes("--restore");

if (restore) {
  logInfo("Restoring files to their original names...");
} else {
  logInfo("Backing up files to gitignore...");
}

if (existsSync(templates)) {
  renameGitignore(templates, restore);
} else {
  logError(`The "${templates}" directory doesn't exist.`);
}
