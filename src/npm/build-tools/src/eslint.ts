import svelte from 'eslint-plugin-svelte';
import ts from 'typescript-eslint';

/**
 * ESLint for a site on this framework (`export default siteEslint()` in `eslint.config.js`): a small
 * rule set of real bugs, not style (Prettier does style). Type-aware, over `src/`:
 * - `no-floating-promises`: a promise nobody awaits or handles (`void` marks one as deliberate);
 * - `no-unused-vars`: dead code (prefix a name with `_` to keep it).
 */
export function siteEslint({ ignores = [] as string[] } = {}) {
	const files = ['src/**/*.ts', 'src/**/*.svelte'];
	return ts.config(
		{
			ignores: [
				'**/build/',
				'**/.svelte-kit/',
				'**/dist/',
				'**/node_modules/',
				'**/*.config.ts',
				'**/*.config.js',
				...ignores
			]
		},
		// Parses .svelte files (the script inside with TypeScript's parser, below).
		...svelte.configs.base,
		{
			files: ['src/**/*.ts'],
			languageOptions: { parser: ts.parser, parserOptions: { projectService: true } }
		},
		{
			files: ['src/**/*.svelte', 'src/**/*.svelte.ts'],
			languageOptions: { parserOptions: { parser: ts.parser, projectService: true, extraFileExtensions: ['.svelte'] } }
		},
		{
			files,
			plugins: { '@typescript-eslint': ts.plugin },
			rules: {
				'@typescript-eslint/no-floating-promises': 'error',
				'@typescript-eslint/no-unused-vars': [
					'error',
					{ argsIgnorePattern: '^_', varsIgnorePattern: '^_', caughtErrors: 'none' }
				]
			}
		}
	);
}
