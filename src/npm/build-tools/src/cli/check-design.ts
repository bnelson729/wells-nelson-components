#!/usr/bin/env node
/**
 * wn-check-design [--root .] [--strict] [--warn]
 *
 * Checks a site's src/ for drift from the design system (see design-check.ts): raw colors in
 * components and styles reaching into library internals are errors; literal font sizes and
 * z-indexes are warnings (errors with --strict). --warn reports everything without failing, for a
 * site that's still moving over.
 */
import { parseArgs } from 'node:util';
import { checkDesign, formatFindings } from '../design-check.js';

const { values } = parseArgs({
	options: {
		root: { type: 'string', default: '.' },
		strict: { type: 'boolean', default: false },
		warn: { type: 'boolean', default: false }
	}
});

const findings = checkDesign({ root: values.root, strict: values.strict });
const errors = findings.filter((f) => f.severity === 'error').length;
const warnings = findings.length - errors;
if (findings.length) console.log(formatFindings(findings));
console.log(`Design check: ${errors} error(s), ${warnings} warning(s).`);
if (errors && !values.warn) process.exit(1);
