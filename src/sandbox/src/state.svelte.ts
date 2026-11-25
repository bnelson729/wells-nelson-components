/** Sandbox-wide settings the Displays page changes and the shell reads. */
export const shell = $state({
	unsynced: false,
	hideOnScroll: false,
	wide: false,
	avatar: false,
	/** Show the TabBar instead of the header: never, always, or when `phoneLayout` says so. */
	tabBar: 'off' as 'off' | 'on' | 'auto',
	/** Nav labels in the header: none, every labeled button, or only the current page's. */
	labels: 'none' as 'none' | 'always' | 'current',
	profileLabel: false,
	palette: 'blue' as 'blue' | 'green' | 'purple'
});
