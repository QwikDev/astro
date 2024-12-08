import app from "./app";
import { panic } from "./utils";

/** @param args Pass here process.argv */
export async function runCreate(...args: string[]) {
  app.run(args);
}

export default async function (args = process.argv) {
  try {
    await runCreate(...args);
  } catch (err: any) {
    panic(err.message || err);
  }
}
