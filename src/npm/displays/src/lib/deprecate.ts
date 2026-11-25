import { DEV } from 'esm-env';

const warned = new Set<string>();

/**
 * Warn once, in development builds only, that `what` is deprecated and what to use instead. Every
 * rename ships as a deprecated alias that calls this for at least one minor release before the next
 * major removes it. Pair it with a `@deprecated` JSDoc tag so editors strike the old name through.
 */
export function deprecated(what: string, instead: string) {
	if (!DEV || warned.has(what)) return;
	warned.add(what);
	console.warn(`[wells-nelson] ${what} is deprecated; use ${instead}. It will be removed in the next major.`);
}

/** Warn once, in development builds only. For mistakes that render nothing, e.g. an unknown icon. */
export function devWarn(key: string, message: string) {
	if (!DEV || warned.has(key)) return;
	warned.add(key);
	console.warn(`[wells-nelson] ${message}`);
}
