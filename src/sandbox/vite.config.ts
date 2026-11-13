import { svelte } from '@sveltejs/vite-plugin-svelte';
import { mkdirSync, mkdtempSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import type { IncomingMessage } from 'node:http';
import { tmpdir } from 'node:os';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig, type Plugin } from 'vite';
// build-tools is Node code, so the sandbox runs it on the dev server and the page calls it.
import { renderPng, renderSvg } from '../npm/build-tools/src/icons.ts';
import { postbuild } from '../npm/build-tools/src/postbuild.ts';
import { basePath, devJsonModule } from '../npm/build-tools/src/vite.ts';

const here = dirname(fileURLToPath(import.meta.url));
const lib = (path: string) => resolve(here, '../npm', path);

/** Endpoints for the Build tools page (dev server only). */
function buildToolsApi(): Plugin {
	const readBody = (req: IncomingMessage) =>
		new Promise<string>((done) => {
			let body = '';
			req.on('data', (chunk) => (body += chunk));
			req.on('end', () => done(body));
		});

	return {
		name: 'sandbox-build-tools',
		configureServer(server) {
			server.middlewares.use('/__wn', async (req, res) => {
				const url = new URL(req.url ?? '/', 'http://sandbox');
				const q = url.searchParams;
				const send = (status: number, type: string, body: string | Buffer) => {
					res.statusCode = status;
					res.setHeader('content-type', type);
					res.end(body);
				};
				try {
					const icon = {
						letters: q.get('letters') ?? 'WN',
						background: q.get('bg') ?? '#1f5fa8',
						foreground: q.get('fg') ?? '#ffffff'
					};
					if (url.pathname === '/icon.png') {
						const size = Math.min(512, Number(q.get('size') ?? 192));
						return send(200, 'image/png', renderPng(size, icon, { maskable: q.get('maskable') === '1' }));
					}
					if (url.pathname === '/favicon.svg') return send(200, 'image/svg+xml', renderSvg(icon));
					if (url.pathname === '/base-path') {
						const value = q.get('value') ?? '';
						const result = basePath({
							mode: q.get('mode') ?? 'production',
							env: value ? { BASE_PATH: value } : {},
							fallback: q.get('fallback') ?? '/my-app'
						});
						return send(200, 'application/json', JSON.stringify({ base: result }));
					}
					if (url.pathname === '/postbuild' && req.method === 'POST') {
						const { files, forbid } = JSON.parse(await readBody(req)) as {
							files: Record<string, string>;
							forbid: string[];
						};
						const dir = mkdtempSync(join(tmpdir(), 'wn-sandbox-build-'));
						const log: string[] = [];
						try {
							for (const [name, text] of Object.entries(files)) {
								mkdirSync(dirname(join(dir, name)), { recursive: true });
								writeFileSync(join(dir, name), text);
							}
							let error: string | null = null;
							try {
								postbuild({ dir, forbid, log: (m) => log.push(m.replaceAll(dir, 'build')) });
							} catch (err) {
								error = (err instanceof Error ? err.message : String(err)).replaceAll(dir, 'build');
							}
							const out: string[] = [];
							const walk = (d: string) => {
								for (const n of readdirSync(d)) {
									const p = join(d, n);
									if (statSync(p).isDirectory()) walk(p);
									else out.push(relative(dir, p).replaceAll('\\', '/'));
								}
							};
							walk(dir);
							return send(200, 'application/json', JSON.stringify({ error, log, files: out.sort() }));
						} finally {
							rmSync(dir, { recursive: true, force: true });
						}
					}
					send(404, 'text/plain', 'Unknown sandbox endpoint');
				} catch (err) {
					send(400, 'text/plain', err instanceof Error ? err.message : String(err));
				}
			});
		}
	};
}

export default defineConfig(({ command }) => ({
	plugins: [
		svelte(),
		buildToolsApi(),
		// The mock seed shows devJsonModule at work: present in dev, null in `npm run bundle`.
		devJsonModule({ id: 'virtual:seed', file: resolve(here, 'mock-seed.json'), enabled: command === 'serve' })
	],
	resolve: {
		// Build against package sources so library edits hot-reload here.
		alias: [
			{ find: /^@wells-nelson\/displays\/(theme\.css.*)$/, replacement: lib('displays/src/lib/$1') },
			{ find: /^@wells-nelson\/displays\/palettes\/(.*)$/, replacement: lib('displays/src/lib/palettes/$1') },
			{ find: /^@wells-nelson\/displays$/, replacement: lib('displays/src/lib/index.ts') },
			{ find: /^@wells-nelson\/interactions\/account$/, replacement: lib('interactions/src/lib/account/index.ts') },
			{ find: /^@wells-nelson\/interactions$/, replacement: lib('interactions/src/lib/index.ts') },
			{ find: /^@wells-nelson\/data-storage\/sql$/, replacement: lib('data-storage/src/lib/sql.ts') },
			{ find: /^@wells-nelson\/data-storage$/, replacement: lib('data-storage/src/lib/index.ts') }
		]
	},
	optimizeDeps: {
		include: [
			'@supabase/supabase-js',
			'@tanstack/db',
			'@tanstack/rxdb-db-collection',
			'rxdb/plugins/core',
			'rxdb/plugins/replication-supabase',
			'rxdb/plugins/storage-dexie'
		]
	},
	build: { chunkSizeWarningLimit: 2000 },
	server: { port: 5180 }
}));
