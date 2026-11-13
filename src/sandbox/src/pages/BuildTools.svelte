<script lang="ts">
	import { Button } from '@wells-nelson/displays';
	import { Segmented, TextField, Toggle } from '@wells-nelson/interactions';
	import { renderManifest } from '../../../npm/build-tools/src/manifest';
	import seed from 'virtual:seed';
	import Panel from '../Panel.svelte';

	// ------------------------------------------------ icons (rendered on the dev server)
	let letters = $state('WN');
	let background = $state('#1f5fa8');
	let foreground = $state('#ffffff');
	const valid = $derived(
		/^[A-Za-z]{1,3}$/.test(letters) && /^#[0-9a-f]{6}$/i.test(background) && /^#[0-9a-f]{6}$/i.test(foreground)
	);
	const iconQuery = $derived(new URLSearchParams({ letters, bg: background, fg: foreground }).toString());

	// ------------------------------------------------ manifest (pure, runs here)
	let appName = $state('Demo — Projects');
	let shortName = $state('Demo');
	const manifest = $derived(
		renderManifest({
			name: appName,
			shortName,
			description: 'A demo app.',
			backgroundColor: '#f3f5f8',
			themeColor: background
		})
	);

	// ------------------------------------------------ base path
	let mode = $state<'development' | 'production'>('production');
	let basePathValue = $state('');
	let fallback = $state('/my-app');
	let base = $state<string | null>(null);
	$effect(() => {
		const q = new URLSearchParams({ mode, value: basePathValue, fallback });
		fetch(`/__wn/base-path?${q}`)
			.then((r) => (r.ok ? r.json() : Promise.reject(new Error('Needs the dev server'))))
			.then((r: { base: string }) => (base = r.base))
			.catch(() => (base = null));
	});

	// ------------------------------------------------ postbuild against a mock build
	const leakedName = seed?.projects[0]?.tasks[0]?.title ?? 'Audit current pages';
	let leak = $state(false);
	let missingShell = $state(false);
	let result = $state<{ error: string | null; log: string[]; files: string[] } | null>(null);

	async function runPostbuild() {
		const files: Record<string, string> = {
			'_app/immutable/entry/app.js': leak ? `const seed = ${JSON.stringify(leakedName)};` : 'export {};',
			'favicon.svg': '<svg/>'
		};
		if (!missingShell) files['404.html'] = '<!doctype html><title>shell</title>';
		const res = await fetch('/__wn/postbuild', {
			method: 'POST',
			body: JSON.stringify({ files, forbid: [leakedName] })
		});
		result = res.ok ? await res.json() : { error: 'Needs the dev server (npm run sandbox).', log: [], files: [] };
	}
</script>

<Panel title="PWA icons" note="writeIcons / renderPng / renderSvg, rendered by the dev server.">
	<div class="row">
		<TextField label="Letters (1–3, A–Z)" bind:value={letters} />
		<TextField label="Background" bind:value={background} />
		<TextField label="Foreground" bind:value={foreground} />
	</div>
	{#if valid}
		<div class="icons">
			<figure>
				<img src={`/__wn/icon.png?${iconQuery}&size=192`} alt="" width="96" height="96" />
				<figcaption>icon-192.png</figcaption>
			</figure>
			<figure>
				<img src={`/__wn/icon.png?${iconQuery}&size=512&maskable=1`} alt="" width="96" height="96" />
				<figcaption>maskable (full bleed)</figcaption>
			</figure>
			<figure>
				<img src={`/__wn/favicon.svg?${iconQuery}`} alt="" width="96" height="96" />
				<figcaption>favicon.svg</figcaption>
			</figure>
			<figure>
				<img src={`/__wn/favicon.svg?${iconQuery}`} alt="" width="16" height="16" />
				<figcaption>favicon at 16px</figcaption>
			</figure>
		</div>
	{:else}
		<p class="error">Use 1–3 letters and #rrggbb colors.</p>
	{/if}
	<pre>wn-icons --letters {letters} --background "{background}" --foreground "{foreground}"</pre>
</Panel>

<Panel title="Manifest" note="renderManifest; theme color follows the icon background.">
	<div class="row">
		<TextField label="Name" bind:value={appName} />
		<TextField label="Short name" bind:value={shortName} />
	</div>
	<pre>{manifest}</pre>
</Panel>

<Panel title="basePath" note="SvelteKit paths.base from BASE_PATH, for GitHub Pages or a custom domain.">
	<Segmented
		label="Mode"
		bind:value={mode}
		options={[
			{ value: 'production', label: 'production' },
			{ value: 'development', label: 'development' }
		]}
	/>
	<div class="row">
		<TextField label="BASE_PATH (empty = unset)" bind:value={basePathValue} />
		<TextField label="Fallback" bind:value={fallback} />
	</div>
	<p>paths.base = {base === null ? '(needs the dev server)' : `“${base}”`}</p>
</Panel>

<Panel title="postbuild" note="Runs against a throwaway mock build folder on the dev server.">
	<Toggle label={`Leak a seed string (“${leakedName}”) into a chunk`} bind:checked={leak} />
	<Toggle label="Missing 404.html shell" bind:checked={missingShell} />
	<div class="row"><Button variant="primary" onclick={runPostbuild}>Run postbuild</Button></div>
	{#if result}
		{#if result.error}<p class="error">{result.error}</p>{:else}<p>Passed.</p>{/if}
		<pre>{[...result.log, '', 'Files afterwards:', ...result.files].join('\n')}</pre>
	{/if}
</Panel>

<Panel
	title="Service worker and templates"
	note="Not interactive here: see the package README for registerAppShellCache and templates/."
>
	<p class="muted">The service worker needs a SvelteKit build to run; its behavior is covered by the package tests.</p>
</Panel>

<style>
	.icons {
		display: flex;
		flex-wrap: wrap;
		gap: 1rem;
		align-items: flex-end;
	}
	figure {
		margin: 0;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.35rem;
		font-size: 0.8rem;
		color: var(--muted);
	}
	img {
		background: repeating-conic-gradient(var(--surface-2) 0 25%, transparent 0 50%) 0 0 / 12px 12px;
	}
	.error {
		color: var(--danger);
	}
	p {
		margin: 0;
	}
</style>
