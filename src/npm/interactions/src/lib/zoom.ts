/**
 * Stop the browser zooming the page: no pinch zoom and no double-tap zoom (iPad and iPhone
 * Safari, including the home-screen app, and Android). For app-like screens where a stray zoom
 * gets in the way; it also takes away zooming for people who need it, so text and controls have
 * to be big enough without it. Call once on the client; returns a function that undoes it.
 */
export function preventZoom(): () => void {
	const root = document.documentElement;
	const previous = root.style.touchAction;
	// Panning only: no pinch-zoom and no double-tap-zoom anywhere below.
	root.style.touchAction = 'pan-x pan-y';
	// Safari's own pinch gestures (also trackpad pinch in Safari on a Mac).
	const stop = (e: Event) => e.preventDefault();
	const gestures = ['gesturestart', 'gesturechange', 'gestureend'];
	for (const type of gestures) document.addEventListener(type, stop);
	return () => {
		root.style.touchAction = previous;
		for (const type of gestures) document.removeEventListener(type, stop);
	};
}
