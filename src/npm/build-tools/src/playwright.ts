/**
 * Layout checks for a site's end-to-end tests (Playwright). Nothing here imports Playwright: pass
 * the test's `page`.
 *
 * ```ts
 * import { layoutProblems } from '@wells-nelson/build-tools/playwright';
 * expect(await layoutProblems(page, { phoneWidth: 480 })).toEqual([]);
 * ```
 */

/** The part of Playwright's `Page` used here. */
export interface PageLike {
	evaluate<R, A>(fn: (arg: A) => R | Promise<R>, arg: A): Promise<R>;
}

export interface LayoutOptions {
	/**
	 * The containers ("frames") content has to stay inside, as a CSS selector. Each element is
	 * checked against the closest one around it, and the screen. Default: the page column
	 * (`.page`) and open modals (`dialog[open]`).
	 */
	frames?: string;
	/**
	 * A phone-sized app: no frame may be wider than this many CSS pixels, whatever the screen
	 * (e.g. 480). Catches a page column or modal that grows on a tablet or desktop.
	 */
	phoneWidth?: number;
	/** How far (px) something may poke out before it counts, for rounding. Default 1. */
	tolerance?: number;
}

/** The attribute that allows an element (and what's inside it) to reach outside its frame. */
export const MAY_OVERFLOW = 'data-may-overflow';

/**
 * What's laid out wrong on the page as it is now: elements (and list markers) printed outside
 * their frame or the screen, and frames wider than `phoneWidth`. Each problem is one sentence
 * naming the element. An element is allowed out when it, or something around it, has the
 * `data-may-overflow` attribute; anything inside a scrolling or clipping box only has to stay
 * inside that box. Hidden and zero-size elements, and what's fixed to the screen (checked
 * against the screen only), are covered too.
 */
export async function layoutProblems(page: PageLike, options: LayoutOptions = {}): Promise<string[]> {
	return page.evaluate(
		({ frames, phoneWidth, tolerance, mayOverflow }) => {
			const problems: string[] = [];
			const screenWidth = document.documentElement.clientWidth;
			const describe = (el: Element) => {
				const tag = el.tagName.toLowerCase();
				const id = el.id ? `#${el.id}` : '';
				const cls = [...el.classList]
					.filter((c) => !c.startsWith('svelte-'))
					.slice(0, 2)
					.map((c) => `.${c}`)
					.join('');
				const label = el.getAttribute('aria-label') ?? (el.textContent ?? '').trim().slice(0, 40);
				return `${tag}${id}${cls}${label ? ` ("${label}")` : ''}`;
			};
			const visible = (el: Element, rect: DOMRect) => {
				if (rect.width === 0 || rect.height === 0) return false;
				const style = getComputedStyle(el);
				return style.visibility !== 'hidden' && style.display !== 'contents';
			};
			/** Clips what's inside it sideways (so its contents only have to fit in it). */
			const clips = (el: Element) => {
				const x = getComputedStyle(el).overflowX;
				return x !== 'visible';
			};
			const fixed = (el: Element) => {
				for (let e: Element | null = el; e; e = e.parentElement) {
					if (getComputedStyle(e).position === 'fixed') return true;
				}
				return false;
			};

			const frameEls = [...document.querySelectorAll(frames)].filter((f) => visible(f, f.getBoundingClientRect()));
			if (phoneWidth) {
				for (const f of frameEls) {
					const width = f.getBoundingClientRect().width;
					if (width > phoneWidth + tolerance) {
						problems.push(`${describe(f)} is ${Math.round(width)}px wide, wider than a phone (${phoneWidth}px).`);
					}
				}
			}

			for (const el of document.body.querySelectorAll('*')) {
				if (el.closest(`[${mayOverflow}]`)) continue;
				// An icon counts as one box: the shapes drawn inside an svg aren't checked on their own.
				if (el instanceof SVGElement && !(el instanceof SVGSVGElement)) continue;
				const rect = el.getBoundingClientRect();
				if (!visible(el, rect)) continue;
				// Visually hidden text (for screen readers) is clipped to nothing wherever it sits.
				const own = getComputedStyle(el);
				if ((own.clip && own.clip !== 'auto') || own.clipPath.startsWith('inset(50%')) continue;
				// The box it has to stay in: a clipping box around it, else its frame, and always the screen.
				let left = 0;
				let right = screenWidth;
				const isFixed = fixed(el);
				let boundary: Element | null = null;
				for (let e = el.parentElement; e && e !== document.body; e = e.parentElement) {
					if (clips(e) || (!isFixed && e.matches(frames))) {
						boundary = e;
						break;
					}
				}
				if (boundary) {
					const b = boundary.getBoundingClientRect();
					left = Math.max(left, b.left);
					right = Math.min(right, b.right);
				}
				let outLeft = rect.left;
				// A list marker is drawn outside its item, to the left.
				if (own.display === 'list-item' && own.listStyleType !== 'none' && own.listStylePosition === 'outside') {
					outLeft = rect.left - parseFloat(own.fontSize) * 1.5;
				}
				if (outLeft < left - tolerance || rect.right > right + tolerance) {
					const where = boundary ? `its ${describe(boundary)}` : 'the screen';
					const marker = outLeft !== rect.left && rect.left >= left - tolerance ? "'s list marker" : '';
					problems.push(`${describe(el)}${marker} is outside ${where}.`);
				}
			}
			return problems;
		},
		{
			frames: options.frames ?? '.page, dialog[open]',
			phoneWidth: options.phoneWidth ?? 0,
			tolerance: options.tolerance ?? 1,
			mayOverflow: MAY_OVERFLOW
		}
	);
}
