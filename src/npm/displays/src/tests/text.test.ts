import { describe, expect, it } from 'vitest';
import {
	errorText,
	formatDate,
	formatDateTime,
	formatLongDate,
	formatAgo,
	formatRecent,
	formatTime,
	isUserFacing,
	plural,
	rawErrorText,
	userError
} from '../lib/text.js';

describe('errorText', () => {
	it('shows a message written for people as it is', () => {
		const err = userError("You're offline.");
		expect(isUserFacing(err)).toBe(true);
		expect(errorText(err, 'save')).toBe("You're offline.");
		// The same flag from another package (data-storage marks its errors without importing this one).
		expect(errorText(Object.assign(new Error('Ask an owner.'), { userFacing: true }))).toBe('Ask an owner.');
	});

	it('translates known technical messages', () => {
		expect(errorText(new TypeError('Failed to fetch'))).toBe(
			"Couldn't reach the server. Check your connection and try again."
		);
		expect(errorText('JWT expired')).toBe('Your session expired. Sign in again to keep syncing.');
		expect(errorText({ message: 'Email rate limit exceeded' })).toBe(
			'Too many tries in a short time. Wait a minute and try again.'
		);
		expect(errorText('new row violates row-level security policy for table "items"')).toBe(
			"You can't change this any more. It may no longer be shared with you."
		);
		expect(errorText(new Error('QuotaExceededError'))).toContain('out of storage space');
	});

	it('turns anything else into a sentence about the action, keeping the raw text apart', () => {
		const err = new Error('Saving item_stores failed');
		expect(errorText(err, 'save the line')).toBe("Couldn't save the line. Try again in a moment.");
		expect(errorText(err)).toBe("Couldn't do that. Try again in a moment.");
		expect(rawErrorText(err)).toBe('Saving item_stores failed');
		expect(rawErrorText(42)).toBe('42');
	});
});

describe('plural', () => {
	it('counts with the right noun', () => {
		expect(plural(1, 'game')).toBe('1 game');
		expect(plural(0, 'game')).toBe('0 games');
		expect(plural(3, 'category', 'categories')).toBe('3 categories');
	});
});

describe('dates and times', () => {
	const now = new Date(2026, 10, 22, 15, 4).getTime(); // Sun, Nov 22, 2026, 3:04 PM

	it('writes times in 12-hour form without a leading zero or seconds', () => {
		expect(formatTime(new Date(2026, 5, 7, 9, 0, 30).getTime())).toBe('9:00 AM');
		expect(formatTime(new Date(2026, 5, 7, 12, 5).getTime())).toBe('12:05 PM');
	});

	it('writes dates without ordinals, with the year only when it is not this year', () => {
		expect(formatDate(new Date(2026, 5, 7).getTime(), now)).toBe('Sun, Jun 7');
		expect(formatDate(new Date(2025, 5, 7).getTime(), now)).toBe('Sat, Jun 7, 2025');
		expect(formatDateTime(new Date(2025, 5, 7, 10, 0).getTime(), now)).toBe('Sat, Jun 7, 2025, 10:00 AM');
		expect(formatDate(Number.NaN)).toBe('Unknown date');
	});

	it('says today and yesterday for recent times', () => {
		expect(formatRecent(new Date(2026, 10, 22, 9, 30).getTime(), now)).toBe('Today at 9:30 AM');
		expect(formatRecent(new Date(2026, 10, 21, 23, 59).getTime(), now)).toBe('Yesterday at 11:59 PM');
		expect(formatRecent(new Date(2026, 10, 14, 8, 0).getTime(), now)).toBe('Sat, Nov 14 at 8:00 AM');
	});

	it('counts hours and minutes ago, rounded down, within the last 10 hours', () => {
		const ago = (minutes: number, seconds = 0) => formatAgo(now - minutes * 60_000 - seconds * 1000, now);
		expect(ago(0, 59)).toBe('Less than a minute ago');
		expect(formatAgo(now + 30_000, now)).toBe('Less than a minute ago');
		expect(ago(1, 59)).toBe('1 minute ago');
		expect(ago(45)).toBe('45 minutes ago');
		expect(ago(60)).toBe('1 hour ago');
		expect(ago(61)).toBe('1 hour and 1 minute ago');
		expect(ago(125, 30)).toBe('2 hours and 5 minutes ago');
		expect(ago(9 * 60 + 59, 59)).toBe('9 hours and 59 minutes ago');
		expect(ago(10 * 60)).toBe(formatRecent(now - 10 * 3_600_000, now));
		expect(formatAgo(Number.NaN, now)).toBe('Unknown time');
	});

	it('writes long dates for policy pages', () => {
		expect(formatLongDate(new Date(2026, 10, 22).getTime())).toBe('November 22, 2026');
	});
});
