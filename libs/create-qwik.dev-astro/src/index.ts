import app from "./app";

export { app };

/** @param args Pass here process.argv */
export async function run(args: string[]): Promise<number> {
  return app.run(args);
}

export default async function (): Promise<number> {
  return run(process.argv);
}
