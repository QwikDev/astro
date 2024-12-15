import ansiRegex from "ansi-regex";
import { spawn } from "node-pty";

export function $it(
  command: string,
  args: string[] = [],
  interactions: Record<string, string> = {},
  options: { cwd?: string } = {}
): Promise<string> {
  return new Promise((resolve, reject) => {
    const shell = spawn(command, args, {
      name: "xterm-color",
      cols: 80,
      rows: 30,
      cwd: process.cwd(),
      env: process.env,
      ...options
    });

    const cleanOutput = (data: string) => data.replace(ansiRegex(), "");

    let output = "";
    const prompts = Object.entries(interactions);
    const promptsCount = prompts.length;
    let promptIndex = 0;

    shell.onData((data) => {
      const chunk = cleanOutput(data);
      output += data;

      for (let i = promptIndex; i < promptsCount; i++) {
        const [prompt, input] = prompts[i];

        if (chunk.includes(prompt)) {
          shell.write(`${input}\n`);
          break;
        }
        promptIndex++;
      }
    });

    shell.onExit(({ exitCode }) => {
      if (exitCode !== 0) {
        reject(new Error(`Command failed with exit code ${exitCode}`));
      } else {
        resolve(output);
      }
    });
  });
}
