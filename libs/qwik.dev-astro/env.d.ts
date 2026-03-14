/// <reference types="astro/client" />

declare module "fs-move" {
  type MoveOptions = {
    overwrite?: boolean;
    merge?: boolean;
    purge?: boolean;
    filter?: (src: string, dest: string) => boolean;
  };

  type MoveCallback = (err: unknown) => unknown;

  declare function move(src: string, dest: string, callback: MoveCallback): Promise<void>;
  declare function move(
    src: string,
    dest: string,
    options: MoveOptions = {}
  ): Promise<void>;

  declare function move(
    src: string,
    dest: string,
    options: MoveOptions,
    callback: MoveCallback
  ): Promise<void>;

  export default move;
}
