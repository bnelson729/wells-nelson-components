// Point every local tarball dependency (`"file:…/x.tgz"`) whose name starts with $SCOPE at its
// latest published version on the $DIST_TAG dist-tag (`^x.y.z`), in package.json and
// package-lock.json of the current directory. Writes `replaced=<name@range …>` (empty when there
// was nothing to replace) to $GITHUB_OUTPUT. Run by this composite action (action.yml).
//
// Every tarball spec is rewritten before anything is installed: an install sees the whole tree,
// so a tarball left for later (its path only exists on the machine that packed it) would fail it.
const { execFileSync, execSync } = require('node:child_process');
const { appendFileSync, existsSync, readFileSync, writeFileSync } = require('node:fs');

const scope = process.env.SCOPE ?? '@wells-nelson/';
const distTag = process.env.DIST_TAG || 'latest';
const SECTIONS = ['dependencies', 'devDependencies', 'optionalDependencies'];

// Keep the file's own indentation and final newline.
const save = (file, text, data) => {
	const indent = text.match(/^[ \t]+(?=")/m)?.[0] ?? '  ';
	writeFileSync(file, JSON.stringify(data, null, indent) + (text.endsWith('\n') ? '\n' : ''));
};

const pkgText = readFileSync('package.json', 'utf8');
const pkg = JSON.parse(pkgText);
const replaced = [];
for (const section of SECTIONS) {
	for (const [name, spec] of Object.entries(pkg[section] ?? {})) {
		if (!name.startsWith(scope) || !/^file:.*\.tgz$/.test(spec)) continue;
		const args = ['view', `${name}@${distTag}`, 'version'];
		// npm is a .cmd shim on Windows, which only runs through a shell (locally; CI runs on Linux).
		const out =
			process.platform === 'win32'
				? execSync(`npm ${args.join(' ')}`, { encoding: 'utf8' })
				: execFileSync('npm', args, { encoding: 'utf8' });
		const version = out.trim();
		if (!version) throw new Error(`${name} has no published version tagged ${distTag}`);
		console.log(`${section}: ${name} ${spec} -> ^${version}`);
		// Same section, new range: the package stays a dependency or dev dependency.
		pkg[section][name] = `^${version}`;
		replaced.push(`${name}@^${version}`);
	}
}

if (replaced.length === 0) console.log('No local tarball dependencies.');
else {
	save('package.json', pkgText, pkg);
	// Drop the lock's entries for those packages (they point at the tarballs), so npm resolves
	// them from the registry. Everything else stays locked.
	if (existsSync('package-lock.json')) {
		const lockText = readFileSync('package-lock.json', 'utf8');
		const lock = JSON.parse(lockText);
		const names = replaced.map((r) => r.slice(0, r.lastIndexOf('@')));
		for (const key of Object.keys(lock.packages ?? {})) {
			if (names.some((n) => key === `node_modules/${n}` || key.startsWith(`node_modules/${n}/`)))
				delete lock.packages[key];
		}
		const root = lock.packages?.[''];
		if (root)
			for (const section of SECTIONS) {
				for (const name of names) if (root[section]?.[name] !== undefined) root[section][name] = pkg[section][name];
			}
		save('package-lock.json', lockText, lock);
	}
}

if (process.env.GITHUB_OUTPUT) appendFileSync(process.env.GITHUB_OUTPUT, `replaced=${replaced.join(' ')}\n`);
