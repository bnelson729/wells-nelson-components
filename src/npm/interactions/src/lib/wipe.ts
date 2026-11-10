export interface WipeOptions {
	/**
	 * App teardown to run first: unmount live queries, sign out locally, close and remove the
	 * app's databases. Errors are logged and the wipe continues.
	 */
	beforeWipe?: () => void | Promise<void>;
	/** Where to go afterwards (a full page load). Defaults to the site root. */
	redirectTo?: string;
}

/**
 * Development helper: delete every IndexedDB database, localStorage and sessionStorage entry on
 * this origin, then reload at `redirectTo`. Nothing on the server is touched.
 * Only wire this up in development builds.
 */
export async function wipeAllData({ beforeWipe, redirectTo = '/' }: WipeOptions = {}) {
	try {
		await beforeWipe?.();
	} catch (err) {
		console.warn('Teardown before wipe failed', err);
	}
	// Anything left over (e.g. other accounts' cloud databases).
	const databases = (await indexedDB.databases?.()) ?? [];
	await Promise.all(
		databases
			.filter((d) => d.name)
			.map(
				(d) =>
					new Promise<void>((done) => {
						const req = indexedDB.deleteDatabase(d.name!);
						req.onsuccess = req.onerror = req.onblocked = () => done();
					})
			)
	);
	localStorage.clear();
	sessionStorage.clear();
	location.replace(redirectTo);
}
