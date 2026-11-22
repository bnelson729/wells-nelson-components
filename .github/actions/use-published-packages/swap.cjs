// Point every local tarball dependency (`"file:…/x.tgz"`) whose name starts with $SCOPE at its
// latest published version on the $DIST_TAG dist-tag (`^x.y.z`), in package.json and
// package-lock.json of the current directory. Writes `replaced=<name@range …>` (empty when there
// was nothing to replace) to $GITHUB_OUTPUT. Run by this composite action (action.yml).
//
// Every tarball spec is rewritten before anything is installed: an install sees the whole tree,
// so a tarball left for later (its path only exists on the machine that packed it) would fail it.
// That includes a lock that still resolves a package to a tarball while package.json already
// asks for a published range (e.g. after a merge kept one file's side of a conflict): the lock's
// entry goes, and the install resolves package.json's range from the registry.
const { execFileSync, execSync } = require('node:child_process');
const { appendFileSync, existsSync, readFileSync, writeFileSync } = require('node:fs');

const scope = process.env.SCOPE ?? '@wells-nelson/';
const distTag = process.env.DIST_TAG || 'latest';
const SECTIONS = ['dependencies', 'devDependencies', 'optionalDependencies'];
const isTarball = (spec) => typeof spec === 'string' && /^file:.*\.tgz$/.test(spec);

// Keep the file's own indentation and final newline.
const save = (file, text, data) => {
	const indent = text.match(/^[ \t]+(?=")/m)?.[0] ?? '  ';
	writeFileSync(file, JSON.stringify(data, null, indent) + (text.endsWith('\n') ? '\n' : ''));
};

function publishedVersion(name) {
	const args = ['view', `${name}@${distTag}`, 'version'];
	// npm is a .cmd shim on Windows, which only runs through a shell (locally; CI runs on Linux).
	const out =
		process.platform === 'win32'
			? execSync(`npm ${args.join(' ')}`, { encoding: 'utf8' })
			: execFileSync('npm', args, { encoding: 'utf8' });
	const version = out.trim();
	if (!version) throw new Error(`${name} has no published version tagged ${distTag}`);
	return version;
}

const pkgText = readFileSync('package.json', 'utf8');
const pkg = JSON.parse(pkgText);
/** name -> the range package.json asks for, for every package fixed in either file. */
const fixed = new Map();

// 1. package.json: tarball specs become the latest published version.
for (const section of SECTIONS) {
	for (const [name, spec] of Object.entries(pkg[section] ?? {})) {
		if (!name.startsWith(scope) || !isTarball(spec)) continue;
		const range = `^${publishedVersion(name)}`;
		console.log(`package.json ${section}: ${name} ${spec} -> ${range}`);
		// Same section, new range: the package stays a dependency or dev dependency.
		pkg[section][name] = range;
		fixed.set(name, range);
	}
}
if (fixed.size > 0) save('package.json', pkgText, pkg);

// 2. package-lock.json: drop every entry that resolves an in-scope package to a tarball (its own
// and its nested ones), and set the root's specs to package.json's, so npm resolves them from
// the registry. Everything else stays locked.
if (existsSync('package-lock.json')) {
	const lockText = readFileSync('package-lock.json', 'utf8');
	const lock = JSON.parse(lockText);
	const packages = lock.packages ?? {};
	const rangeOf = (name) => SECTIONS.map((s) => pkg[s]?.[name]).find(Boolean);
	/** Tarball entries, wherever they're nested. */
	const drop = new Set();
	for (const [key, entry] of Object.entries(packages)) {
		const name = key.slice(key.lastIndexOf('node_modules/') + 'node_modules/'.length);
		if (!key || !name.startsWith(scope) || !isTarball(entry.resolved)) continue;
		drop.add(key);
		if (!fixed.has(name)) {
			const range = rangeOf(name);
			if (!range) continue;
			console.log(`package-lock.json: ${name} resolved to ${entry.resolved}, but package.json asks for ${range}`);
			fixed.set(name, range);
		}
	}
	const names = [...fixed.keys()];
	if (names.length > 0) {
		for (const key of Object.keys(packages)) {
			if (drop.has(key) || names.some((n) => key === `node_modules/${n}` || key.startsWith(`node_modules/${n}/`)))
				delete packages[key];
		}
		const root = packages[''];
		if (root)
			for (const section of SECTIONS) {
				for (const name of names) if (root[section]?.[name] !== undefined) root[section][name] = pkg[section][name];
			}
		save('package-lock.json', lockText, lock);
	}
}

const replaced = [...fixed].map(([name, range]) => `${name}@${range}`);
if (replaced.length === 0) console.log('No local tarball dependencies.');
if (process.env.GITHUB_OUTPUT) appendFileSync(process.env.GITHUB_OUTPUT, `replaced=${replaced.join(' ')}\n`);
