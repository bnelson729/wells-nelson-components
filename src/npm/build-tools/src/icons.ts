import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { deflateSync } from 'node:zlib';

/**
 * PWA icons (PNG) and favicon (SVG) drawn from one to three letters, without dependencies.
 * Letters are polylines with round caps in a 100x100 design space (y down), 50 units tall.
 */

type Point = [number, number];
type Path = Point[];

const STROKE = 11;

/** Points along an ellipse from angle a0 to a1 (degrees, y down: -90 is up). */
function arc(cx: number, cy: number, rx: number, ry: number, a0: number, a1: number, step = 5): Path {
	const pts: Path = [];
	const dir = a1 >= a0 ? 1 : -1;
	for (let a = a0; dir > 0 ? a <= a1 : a >= a1; a += dir * step) {
		const t = (a * Math.PI) / 180;
		pts.push([cx + rx * Math.cos(t), cy + ry * Math.sin(t)]);
	}
	return pts;
}

const P = (...pts: Point[]): Path => pts;

/** Glyphs centered on x = 0, from y = 0 (top) to y = 50 (baseline), about 21 units wide. */
const GLYPHS: Record<string, Path[]> = {
	A: [P([-10, 50], [0, 0], [10, 50]), P([-5.6, 30], [5.6, 30])],
	B: [
		[[-9, 50], [-9, 0], [-1, 0], ...arc(-1, 11.5, 11.5, 11.5, -90, 90), [-9, 23]],
		[[-9, 23], [-3.5, 23], ...arc(-3.5, 36.5, 13.5, 13.5, -90, 90), [-9, 50]]
	],
	C: [arc(0, 25, 10.5, 25, -45, -315)],
	D: [[[-9, 0], [-9, 50]], [[-9, 0], ...arc(-9, 25, 19.5, 25, -90, 90)]],
	E: [P([10, 0], [-9, 0], [-9, 50], [10, 50]), P([-9, 25], [6, 25])],
	F: [P([10, 0], [-9, 0], [-9, 50]), P([-9, 25], [6, 25])],
	G: [[...arc(0, 25, 10.5, 25, -45, -360), [2, 25]]],
	H: [P([-10, 0], [-10, 50]), P([10, 0], [10, 50]), P([-10, 25], [10, 25])],
	I: [P([0, 0], [0, 50]), P([-6, 0], [6, 0]), P([-6, 50], [6, 50])],
	J: [[[8, 0], [8, 38], ...arc(-1, 38, 9, 12, 0, 160)]],
	K: [P([-9, 0], [-9, 50]), P([10, 0], [-9, 30]), P([-2.5, 22], [10, 50])],
	L: [P([-10, 0], [-10, 50], [10, 50])],
	M: [P([-11, 50], [-11, 0], [0, 30], [11, 0], [11, 50])],
	N: [P([-10, 50], [-10, 0], [10, 50], [10, 0])],
	O: [arc(0, 25, 10.5, 25, 0, 360)],
	P: [[[-9, 50], [-9, 0], [0, 0], ...arc(0, 13.5, 10, 13.5, -90, 90), [-9, 27]]],
	Q: [arc(0, 25, 10.5, 25, 0, 360), P([3, 38], [11, 52])],
	R: [[[-9, 50], [-9, 0], [0, 0], ...arc(0, 13.5, 10, 13.5, -90, 90), [-9, 27]], P([0, 27], [10, 50])],
	S: [[...arc(0, 12.5, 12.5, 12.5, -20, -270), ...arc(0, 37.5, 12.5, 12.5, -90, 160)]],
	T: [P([-11, 0], [11, 0]), P([0, 0], [0, 50])],
	U: [[[-10, 0], ...arc(0, 40, 10, 10, 180, 0), [10, 0]]],
	V: [P([-10, 0], [0, 50], [10, 0])],
	W: [P([-12, 0], [-6, 50], [0, 18], [6, 50], [12, 0])],
	X: [P([-10, 0], [10, 50]), P([10, 0], [-10, 50])],
	Y: [P([-10, 0], [0, 25], [10, 0]), P([0, 25], [0, 50])],
	Z: [P([-10, 0], [10, 0], [-10, 50], [10, 50])]
};

export const SUPPORTED_LETTERS = Object.keys(GLYPHS).join('');

/** Horizontal centers of each letter for a mark of 1, 2 or 3 letters. */
const SLOTS: Record<number, number[]> = { 1: [50], 2: [32, 68], 3: [21, 50, 79] };

/** The mark's strokes in the 100x100 design space. */
export function markPaths(letters: string): Path[] {
	const chars = [...letters.toUpperCase()];
	const slots = SLOTS[chars.length];
	if (!slots) throw new Error(`Icons need 1 to 3 letters, got "${letters}".`);
	return chars.flatMap((ch, i) => {
		const glyph = GLYPHS[ch];
		if (!glyph) throw new Error(`No glyph for "${ch}". Supported: ${SUPPORTED_LETTERS}.`);
		return glyph.map((path) => path.map(([x, y]): Point => [slots[i] + x, 25 + y]));
	});
}

export function parseHex(hex: string): [number, number, number] {
	const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
	if (!m) throw new Error(`Expected a #rrggbb color, got "${hex}".`);
	const n = parseInt(m[1], 16);
	return [(n >> 16) & 0xff, (n >> 8) & 0xff, n & 0xff];
}

function distToSegment(px: number, py: number, [ax, ay]: Point, [bx, by]: Point) {
	const dx = bx - ax;
	const dy = by - ay;
	const len2 = dx * dx + dy * dy;
	const t = len2 ? Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / len2)) : 0;
	return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
}

function distToGlyph(paths: Path[], x: number, y: number) {
	let min = Infinity;
	for (const path of paths) {
		for (let i = 0; i < path.length - 1; i++) min = Math.min(min, distToSegment(x, y, path[i], path[i + 1]));
	}
	return min;
}

function inRoundedRect(x: number, y: number, size: number, radius: number) {
	const cx = Math.min(Math.max(x, radius), size - radius);
	const cy = Math.min(Math.max(y, radius), size - radius);
	return Math.hypot(x - cx, y - cy) <= radius;
}

export interface IconOptions {
	/** One to three letters, e.g. "WN". */
	letters: string;
	/** Background color, #rrggbb. */
	background: string;
	/** Letter color, #rrggbb (default white). */
	foreground?: string;
}

/** Render the mark as a PNG. Maskable icons are full-bleed with the mark inside the safe zone. */
export function renderPng(size: number, { letters, background, foreground = '#ffffff' }: IconOptions, { maskable = false } = {}) {
	const paths = markPaths(letters);
	const BG = parseHex(background);
	const FG = parseHex(foreground);
	const SS = 4; // supersampling per axis
	const glyphScale = maskable ? 0.62 : 0.82;
	const offset = (1 - glyphScale) * 50;
	const radius = maskable ? 0 : size * 0.22;
	const toGlyph = (v: number) => ((v / size) * 100 - offset) / glyphScale;
	// Half a pixel's diagonal in design units: pixels further than this from the stroke edge are
	// entirely inside or outside it, so only edge pixels need supersampling.
	const halfDiagonal = (Math.SQRT2 / 2) * (100 / size / glyphScale);
	const px = Buffer.alloc(size * size * 4);
	for (let y = 0; y < size; y++) {
		for (let x = 0; x < size; x++) {
			const d = distToGlyph(paths, toGlyph(x + 0.5), toGlyph(y + 0.5));
			const coverage = d > STROKE / 2 + halfDiagonal ? 0 : d < STROKE / 2 - halfDiagonal ? 1 : -1;
			let bg = 0;
			let fg = 0;
			for (let sy = 0; sy < SS; sy++) {
				for (let sx = 0; sx < SS; sx++) {
					const fx = x + (sx + 0.5) / SS;
					const fy = y + (sy + 0.5) / SS;
					if (!maskable && !inRoundedRect(fx, fy, size, radius)) continue;
					bg++;
					if (coverage === 1 || (coverage === -1 && distToGlyph(paths, toGlyph(fx), toGlyph(fy)) <= STROKE / 2)) fg++;
				}
			}
			const i = (y * size + x) * 4;
			const f = bg ? fg / bg : 0;
			for (let c = 0; c < 3; c++) px[i + c] = Math.round(BG[c] * (1 - f) + FG[c] * f);
			px[i + 3] = Math.round((bg / (SS * SS)) * 255);
		}
	}
	return encodePng(size, size, px);
}

const CRC_TABLE = Array.from({ length: 256 }, (_, n) => {
	let c = n;
	for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
	return c >>> 0;
});
function crc32(buf: Buffer) {
	let c = 0xffffffff;
	for (const b of buf) c = CRC_TABLE[(c ^ b) & 0xff] ^ (c >>> 8);
	return (c ^ 0xffffffff) >>> 0;
}
function chunk(type: string, data: Buffer) {
	const len = Buffer.alloc(4);
	len.writeUInt32BE(data.length);
	const td = Buffer.concat([Buffer.from(type, 'ascii'), data]);
	const crc = Buffer.alloc(4);
	crc.writeUInt32BE(crc32(td));
	return Buffer.concat([len, td, crc]);
}
function encodePng(w: number, h: number, rgba: Buffer) {
	const ihdr = Buffer.alloc(13);
	ihdr.writeUInt32BE(w, 0);
	ihdr.writeUInt32BE(h, 4);
	ihdr[8] = 8; // bit depth
	ihdr[9] = 6; // RGBA
	const raw = Buffer.alloc((w * 4 + 1) * h);
	for (let y = 0; y < h; y++) rgba.copy(raw, y * (w * 4 + 1) + 1, y * w * 4, (y + 1) * w * 4);
	return Buffer.concat([
		Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
		chunk('IHDR', ihdr),
		chunk('IDAT', deflateSync(raw, { level: 9 })),
		chunk('IEND', Buffer.alloc(0))
	]);
}

/** The favicon: the same mark as an SVG with a rounded background. */
export function renderSvg({ letters, background, foreground = '#ffffff' }: IconOptions) {
	const s = 0.82;
	const o = (1 - s) * 50;
	const pt = ([x, y]: Point) => `${(o + x * s).toFixed(2)} ${(o + y * s).toFixed(2)}`;
	const paths = markPaths(letters).map((p) => `<path d="M${p.map(pt).join(' L')}"/>`);
	return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
<rect width="100" height="100" rx="22" fill="${background}"/>
<g fill="none" stroke="${foreground}" stroke-width="${(STROKE * s).toFixed(2)}" stroke-linecap="round" stroke-linejoin="round">
${paths.join('\n')}
</g>
</svg>
`;
}

/**
 * Write `icons/icon-192.png`, `icons/icon-512.png`, `icons/icon-maskable-512.png` and
 * `favicon.svg` under `outDir` (SvelteKit's `static/`). Returns the written paths.
 */
export function writeIcons(options: IconOptions & { outDir?: string }) {
	const outDir = options.outDir ?? 'static';
	mkdirSync(join(outDir, 'icons'), { recursive: true });
	const files: [string, Buffer | string][] = [
		[join(outDir, 'icons/icon-192.png'), renderPng(192, options)],
		[join(outDir, 'icons/icon-512.png'), renderPng(512, options)],
		[join(outDir, 'icons/icon-maskable-512.png'), renderPng(512, options, { maskable: true })],
		[join(outDir, 'favicon.svg'), renderSvg(options)]
	];
	for (const [path, data] of files) writeFileSync(path, data);
	return files.map(([path]) => path);
}
