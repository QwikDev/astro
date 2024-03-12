declare module 'fs-move' {

	type MoveOptions = {
		overwrite?: bool,
		merge?: bool,
		purge?: bool,
		filter?: (src: string, dest: string) => bool
	};

	type MoveCallback = (err: any) => unknown;

	async function move(src: string, dest: string, callback: MoveCallback);
	async function move(src: string, dest: string, options: MoveOptions = {});
	async function move(src: string, dest: string, options: MoveOptions, callback: MoveCallback);

	export default move;

}