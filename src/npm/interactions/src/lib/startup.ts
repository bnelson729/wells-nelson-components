/**
 * Keep an installed app current: ask the browser to look for a new service worker now (it installs
 * and takes over on its own) and whenever the app comes back to the foreground. SvelteKit's
 * `updated` does the same for the page itself; `AppVersion` offers the reload. Does nothing in
 * development or without service workers. Returns a function that stops the foreground checks.
 */
export function checkForUpdatesOnStart(options: { dev?: boolean } = {}): () => void {
	if (options.dev || typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return () => {};
	const update = () => void navigator.serviceWorker.getRegistration().then((r) => r?.update().catch(() => {}));
	const onVisible = () => {
		if (document.visibilityState === 'visible') update();
	};
	update();
	document.addEventListener('visibilitychange', onVisible);
	return () => document.removeEventListener('visibilitychange', onVisible);
}

/**
 * iOS Safari only applies `:active` styles (the theme's touch feedback in `touch-app` pages) once
 * the page has a touch listener; this adds an empty, passive one. Returns a function that removes it.
 */
export function touchFeedback(): () => void {
	const noop = () => {};
	document.addEventListener('touchstart', noop, { passive: true });
	return () => document.removeEventListener('touchstart', noop);
}
