import { siteEslint } from './src/npm/build-tools/dist/eslint.js';

// The same small rule set the sites use (build build-tools first: `npm run build`).
export default siteEslint({ ignores: ['src/npm/*/dist/', 'src/sandbox/dist/', 'tests/'] });
