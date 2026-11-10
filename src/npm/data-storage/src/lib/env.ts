export interface EnvConfig {
	supabaseUrl: string;
	supabaseAnonKey: string;
	/** False when either Supabase value is missing: the app runs fully local-only. */
	cloudConfigured: boolean;
}

/**
 * Read the Supabase settings from Vite env vars. Pass `import.meta.env` from the app, so the
 * values are replaced at the app's build time:
 *
 * ```ts
 * export const env = envConfig(import.meta.env);
 * ```
 *
 * Values come from `.env.local` during development and from repository variables in the deploy
 * workflow. When either is missing the app runs fully local-only.
 */
export function envConfig(env: { readonly [key: string]: unknown }): EnvConfig {
	const read = (key: string) => (typeof env[key] === 'string' ? (env[key] as string) : '');
	const supabaseUrl = read('VITE_SUPABASE_URL');
	const supabaseAnonKey = read('VITE_SUPABASE_ANON_KEY');
	return { supabaseUrl, supabaseAnonKey, cloudConfigured: Boolean(supabaseUrl && supabaseAnonKey) };
}
