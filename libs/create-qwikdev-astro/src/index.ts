import addApp from "./add-flow/command.js";
import app from "./app";
import upgradeApp from "./upgrade.js";

export { app };

/** @param args Pass here process.argv */
export async function run(args: string[]): Promise<number> {
  // Find the first non-flag argument at index >= 2 (after node + script path)
  const subcommand = args.slice(2).find((arg) => !arg.startsWith("-"));

  if (subcommand === "upgrade") {
    const idx = args.indexOf(subcommand, 2);
    const filtered = [...args.slice(0, idx), ...args.slice(idx + 1)];
    return upgradeApp.run(filtered);
  }

  if (subcommand === "add") {
    const idx = args.indexOf(subcommand, 2);
    const filtered = [...args.slice(0, idx), ...args.slice(idx + 1)];
    return addApp.run(filtered);
  }

  return app.run(args);
}

export default async function (): Promise<number> {
  return run(process.argv);
}
