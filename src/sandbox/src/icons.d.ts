// The icons main.ts registers, declared so their names are type-checked like the base set's.
import '@wells-nelson/displays';

declare module '@wells-nelson/displays' {
	interface AppIcons {
		layout: true;
		cursor: true;
		users: true;
		database: true;
		copy: true;
		tool: true;
		grid: true;
	}
}
