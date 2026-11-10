declare module 'virtual:seed' {
	export interface SeedProject {
		name: string;
		tasks: { title: string; external_ref: string; done: boolean }[];
		note: string;
	}
	const seed: { projects: SeedProject[] } | null;
	export default seed;
}
