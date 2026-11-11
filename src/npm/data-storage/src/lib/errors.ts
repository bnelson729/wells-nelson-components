/**
 * Client error reporting. Library code calls `reportError` where something fails without the
 * user necessarily noticing (a local write, sync, device prefs); the store installs a reporter
 * that sends each report to the app's Supabase project (see `remoteReporter`). Reports are
 * de-duplicated by kind and message and capped per page load.
 */

export type ErrorKind = 'write' | 'sync' | 'prefs' | 'unhandled' | (string & {});

export interface ErrorReport {
	kind: ErrorKind;
	message: string;
	/** Extra context, e.g. a stack trace. */
	detail?: string;
}

export type ErrorReporter = (report: ErrorReport) => void;

const MAX_REPORTS = 20;
let reporter: ErrorReporter | null = null;
let sent = 0;
const seen = new Set<string>();
const writeListeners = new Set<(message: string) => void>();

/** Where reports go (null to stop reporting). */
export function setErrorReporter(next: ErrorReporter | null) {
	reporter = next;
}

/** Forget what was reported (tests). */
export function resetErrorReports() {
	sent = 0;
	seen.clear();
}

export function describeError(err: unknown): { message: string; detail?: string } {
	if (err instanceof Error) return { message: err.message || err.name, detail: err.stack };
	if (err && typeof err === 'object') {
		const e = err as { message?: unknown; code?: unknown };
		if (typeof e.message === 'string') return { message: e.message, detail: safeJson(err) };
		return { message: safeJson(err) ?? String(err) };
	}
	return { message: String(err) };
}

function safeJson(value: unknown): string | undefined {
	try {
		return JSON.stringify(value);
	} catch {
		return undefined;
	}
}

/** Report an error once per kind and message (and at most 20 per page load). Never throws. */
export function reportError(kind: ErrorKind, err: unknown, detail?: string) {
	const described = describeError(err);
	const key = `${kind}:${described.message}`;
	if (seen.has(key) || sent >= MAX_REPORTS) return;
	seen.add(key);
	if (!reporter) return;
	sent++;
	try {
		reporter({ kind, message: described.message, detail: detail ?? described.detail });
	} catch {
		/* reporting must never break the app */
	}
}

/** Called with a message whenever a local write fails (see `persist`). Returns an unsubscribe. */
export function onWriteError(listener: (message: string) => void) {
	writeListeners.add(listener);
	return () => void writeListeners.delete(listener);
}

/** A local write failed: tell listeners (the store shows it) and report it. */
export function writeFailed(err: unknown) {
	console.error('Failed to save change', err);
	reportError('write', err);
	const { message } = describeError(err);
	for (const listener of writeListeners) listener(message);
}

export interface RemoteReporterOptions {
	supabaseUrl: string;
	supabaseAnonKey: string;
	/** Postgres schema holding `report_client_error` (see the generated migration). */
	schema: string;
	/** App name stored with each report, e.g. the store's appKey. */
	app: string;
	/** The deployed version, stored with each report. */
	version?: string;
}

/**
 * Sends reports to the `report_client_error` function of the app's Supabase schema with a plain
 * `fetch` (no supabase-js needed, so signed-out devices report too). Only the path of the page
 * is sent, never its query or any user data beyond the error itself.
 */
export function remoteReporter(options: RemoteReporterOptions): ErrorReporter {
	const url = `${options.supabaseUrl.replace(/\/$/, '')}/rest/v1/rpc/report_client_error`;
	return ({ kind, message, detail }) => {
		if (typeof fetch === 'undefined') return;
		void fetch(url, {
			method: 'POST',
			keepalive: true,
			headers: {
				apikey: options.supabaseAnonKey,
				Authorization: `Bearer ${options.supabaseAnonKey}`,
				'Content-Type': 'application/json',
				'Content-Profile': options.schema
			},
			body: JSON.stringify({
				p_app: options.app,
				p_version: options.version ?? '',
				p_kind: kind,
				p_message: message.slice(0, 500),
				p_detail: (detail ?? '').slice(0, 4000),
				p_path: typeof location === 'undefined' ? '' : location.pathname
			})
		}).catch(() => {
			/* offline or not set up: drop it */
		});
	};
}
