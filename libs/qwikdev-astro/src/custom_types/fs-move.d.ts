declare module 'fs-move' {

	type MoveOptions = {
		overwrite?: boolean,
		merge?: boolean,
		purge?: boolean,
		filter?: (src: string, dest: string) => boolean
	};

	type MoveCallback = (err: any) => unknown;

	async function move(src: string, dest: string, callback: MoveCallback);
	async function move(src: string, dest: string, options: MoveOptions = {});
	async function move(src: string, dest: string, options: MoveOptions, callback: MoveCallback);

	export default move;
}