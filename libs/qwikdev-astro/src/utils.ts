import type fs from "node:fs";
import { lstat, readdir, readlink } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import fsExtra from "fs-extra";
import move from "fs-move";

export function newHash() {
  const hash = Math.random().toString(26).split(".").pop();
  globalThis.hash = hash;
  return hash;
}

export async function moveArtifacts(srcDir: string, destDir: string) {
  // Ensure the destination dir exists, create if not
  await fsExtra.ensureDir(destDir);

  for (const file of await readdir(srcDir)) {
    // move files from source to destintation, overwrite if they exist
    await move(join(srcDir, file), join(destDir, file), {
      // Merge directories
      merge: true,
      // Don't overwrite any files, as this would overwrite astro-generated files with files from public.
      // This matches astro's default behavior of replacing files in public with generated pages on naming-conflicts.
      overwrite: false
    });
  }
}

export async function crawlDirectory(dir: string): Promise<string[]> {
  /**
   * Recursively follows a symlink.
   *
   * @param path symlink to follow
   * @returns `[target, stat]` where `target` is the final target path and `stat` is the {@link fs.Stats} of the target or `undefined` if the target does not exist.
   */
  const readLinkRec = async (path: string): Promise<[string, fs.Stats | undefined]> => {
    const target = resolve(dirname(path), await readlink(path));
    const stat = await lstat(target).catch((e) => {
      if (e.code === "ENOENT") {
        return undefined;
      }

      throw e;
    });

    if (stat?.isSymbolicLink()) {
      return readLinkRec(target);
    }

    return [target, stat];
  };

  /**
   * Recurse on the passed directory. Follows symlinks and stops when a loop is detected (i.e., `dir` has already been visited)
   *
   * @param dir The current directory to recursively list
   * @param visitedDirs Directories that have already been visited
   * @returns A recursive list of files in the passed directory
   */
  const crawl = async (dir: string, visitedDirs: string[]): Promise<string[]> => {
    if (visitedDirs.includes(dir)) {
      return [];
    }

    visitedDirs.push(dir);
    const entries = await readdir(dir, { withFileTypes: true });

    const files = await Promise.all(
      entries.map((entry) => {
        const fullPath = join(dir, entry.name);

        if (entry.isSymbolicLink()) {
          return readLinkRec(fullPath).then(
            ([target, stat]): string | string[] | Promise<string[]> => {
              if (stat === undefined) {
                return []; // target does not exist
              }

              return stat.isDirectory() ? crawl(target, visitedDirs) : target;
            }
          );
        }

        return entry.isDirectory() ? crawl(fullPath, visitedDirs) : fullPath;
      })
    );

    // flatten files array
    return files.flat();
  };

  // Absolute path for duplicate-detection
  const absoluteDir = resolve(dir);
  return crawl(absoluteDir, []);
}
