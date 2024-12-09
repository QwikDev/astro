import app from "./app";

/** @param args Pass here process.argv */
export async function runCreate(...args: string[]) {
  app.run(args);
}

export default async function (args = process.argv) {
  try {
    await runCreate(...args);
  } catch (err: any) {
    app.panic(err.message || err);
  }
}
