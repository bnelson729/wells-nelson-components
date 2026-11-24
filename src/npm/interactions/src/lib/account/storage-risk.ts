/**
 * Whether this browser deletes the site's data on its own after 7 days without a visit: Safari
 * (and the other browsers on iPhone and iPad, which all use Safari's engine) outside an installed
 * app. Installed apps (Home Screen on iPhone and iPad, Add to Dock on a Mac) are exempt.
 */
export function deviceMayClearData(nav: Navigator | undefined = globalThis.navigator): boolean {
	if (!nav) return false;
	if (installed()) return false;
	// iPhone and iPad (any browser): only WebKit there has `navigator.standalone`.
	if ((nav as Navigator & { standalone?: boolean }).standalone === false) return true;
	// Safari on a Mac.
	const ua = nav.userAgent ?? '';
	return /Macintosh/.test(ua) && /Safari\//.test(ua) && !/Chrome|Chromium|CriOS|Edg|Firefox|FxiOS|OPR/.test(ua);
}

/** Running as an installed app (from the Home Screen, the Dock or an app window). */
function installed() {
	return typeof matchMedia === 'function' && matchMedia('(display-mode: standalone)').matches;
}

/** How to install the app on this device, in a few words. */
export function installHint(nav: Navigator | undefined = globalThis.navigator): string {
	const iOS = (nav as (Navigator & { standalone?: boolean }) | undefined)?.standalone === false;
	return iOS
		? 'In Safari, tap Share, then Add to Home Screen.'
		: "In Safari, choose File, then Add to Dock. Or use your browser's install option.";
}
