/**
 * Shared wording helpers: turning errors into sentences a person can act on, counts with the
 * right plural, and the one date and time format every app uses (see docs/content-style.md).
 */

// ---------------------------------------------------------------- errors

/** An error whose message was written for people, so it's shown as it is. */
export interface UserFacingError extends Error {
	userFacing: true;
}

/** An Error whose message is shown to people as it is (other errors get a general sentence). */
export function userError(message: string): UserFacingError {
	return Object.assign(new Error(message), { userFacing: true as const });
}

/** Whether `err` carries a message written for people (`userError`, or any error with `userFacing: true`). */
export function isUserFacing(err: unknown): err is { message: string } {
	return !!err && typeof err === 'object' && (err as { userFacing?: unknown }).userFacing === true && 'message' in err;
}

/** The error as one line of text, unchanged: for "Details", logs and reports. */
export function rawErrorText(err: unknown): string {
	if (err instanceof Error) return err.message;
	if (err && typeof err === 'object' && typeof (err as { message?: unknown }).message === 'string') {
		return (err as { message: string }).message;
	}
	return String(err);
}

const KNOWN: [RegExp, string][] = [
	[
		/failed to fetch|networkerror|network request failed|load failed|fetch failed|err_internet|err_network|timed? ?out/i,
		"Couldn't reach the server. Check your connection and try again."
	],
	[
		/jwt expired|invalid jwt|refresh token|auth session missing|not authenticated/i,
		'Your session expired. Sign in again to keep syncing.'
	],
	[/rate limit|too many requests/i, 'Too many tries in a short time. Wait a minute and try again.'],
	[
		/row-level security|row level security|permission denied/i,
		"You can't change this any more. It may no longer be shared with you."
	],
	[
		/quota|storage full|disk full|no space/i,
		'This device is out of storage space. Free up some space, or export a backup from the Profile.'
	]
];

/** A known technical message (network, session, rate limit, permission, storage) as a plain sentence; null otherwise. */
export function knownErrorText(raw: string): string | null {
	return KNOWN.find(([pattern]) => pattern.test(raw))?.[1] ?? null;
}

/**
 * An error as a sentence for the UI: a `userError` as it is, a known technical one translated,
 * anything else as "Couldn't {action}. Try again in a moment." (keep the raw text for Details).
 */
export function errorText(err: unknown, action = 'do that'): string {
	if (isUserFacing(err)) return err.message;
	return knownErrorText(rawErrorText(err)) ?? `Couldn't ${action}. Try again in a moment.`;
}

// ---------------------------------------------------------------- counts

/** "1 game", "3 games". `many` defaults to `one` + "s". */
export function plural(count: number, one: string, many = `${one}s`): string {
	return `${count} ${count === 1 ? one : many}`;
}

// ---------------------------------------------------------------- dates and times

const LOCALE = 'en-US';
/** Intl puts a narrow no-break space before AM/PM in newer engines; keep a plain one everywhere. */
const tidy = (s: string) => s.replace(/[  ]/g, ' ');

function valid(ms: number) {
	return Number.isFinite(ms) && !Number.isNaN(new Date(ms).getTime());
}

/** "9:00 AM": 12-hour, no leading zero, no seconds. */
export function formatTime(ms: number): string {
	if (!valid(ms)) return 'Unknown time';
	return tidy(new Intl.DateTimeFormat(LOCALE, { hour: 'numeric', minute: '2-digit' }).format(ms));
}

/** "Sat, Jun 7", with the year when it isn't `now`'s year: "Sat, Jun 7, 2025". */
export function formatDate(ms: number, now = Date.now()): string {
	if (!valid(ms)) return 'Unknown date';
	const sameYear = new Date(ms).getFullYear() === new Date(now).getFullYear();
	return tidy(
		new Intl.DateTimeFormat(LOCALE, {
			weekday: 'short',
			month: 'short',
			day: 'numeric',
			...(sameYear ? {} : { year: 'numeric' })
		}).format(ms)
	);
}

/** "Sat, Jun 7, 9:00 AM" (the year added as in `formatDate`). */
export function formatDateTime(ms: number, now = Date.now()): string {
	if (!valid(ms)) return 'Unknown date';
	return `${formatDate(ms, now)}, ${formatTime(ms)}`;
}

/** "Today at 3:04 PM", "Yesterday at 3:04 PM", else "Sat, Jun 7 at 3:04 PM": for when something last happened. */
export function formatRecent(ms: number, now = Date.now()): string {
	if (!valid(ms)) return 'Unknown time';
	const day = (t: number) => new Date(t).setHours(0, 0, 0, 0);
	const days = Math.round((day(now) - day(ms)) / 86_400_000);
	const when = days === 0 ? 'Today' : days === 1 ? 'Yesterday' : formatDate(ms, now);
	return `${when} at ${formatTime(ms)}`;
}

/** How far back `formatAgo` counts in hours and minutes before it gives the time instead. */
export const AGO_MAX_HOURS = 10;

/**
 * "5 minutes ago", "2 hours and 5 minutes ago" (rounded down) within the last 10 hours; earlier, as
 * `formatRecent` ("Yesterday at 3:04 PM"). For when something last happened, e.g. the last sync.
 * Re-render it as time passes (each minute) so the count stays right.
 */
export function formatAgo(ms: number, now = Date.now()): string {
	if (!valid(ms)) return 'Unknown time';
	// A time a little ahead (another device's clock) counts as just now.
	const minutes = Math.max(0, Math.floor((now - ms) / 60_000));
	if (minutes >= AGO_MAX_HOURS * 60) return formatRecent(ms, now);
	if (minutes === 0) return 'Less than a minute ago';
	const hours = Math.floor(minutes / 60);
	const rest = minutes % 60;
	const unit = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`;
	if (hours === 0) return `${unit(rest, 'minute')} ago`;
	if (rest === 0) return `${unit(hours, 'hour')} ago`;
	return `${unit(hours, 'hour')} and ${unit(rest, 'minute')} ago`;
}

/** "November 22, 2026": for long-form pages such as policies. */
export function formatLongDate(ms: number): string {
	if (!valid(ms)) return 'Unknown date';
	return new Intl.DateTimeFormat(LOCALE, { year: 'numeric', month: 'long', day: 'numeric' }).format(ms);
}
