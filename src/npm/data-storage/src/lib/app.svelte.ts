import type { DataSet } from './dataset.js';
import type { DocMap, Location } from './types.js';

/**
 * Holds the two data sets: `local` (this device only, never synced) is always open;
 * `cloud` exists only while signed in and replicates to Supabase.
 */
export class AppState<D extends DocMap<D>> {
	local = $state.raw<DataSet<D> | null>(null);
	cloud = $state.raw<DataSet<D> | null>(null);
	ready = $state(false);
	fatal = $state<string | null>(null);
	/** A local write that failed (e.g. storage full). Show it until dismissed. */
	writeError = $state<string | null>(null);
	/**
	 * Whether the browser keeps this site's data until the user clears it (`true`), or may evict
	 * it under storage pressure or, in Safari, after 7 days without a visit (`false`). Null until
	 * known, or where the browser can't say.
	 */
	persisted = $state<boolean | null>(null);

	dataSet(location: Location): DataSet<D> {
		const ds = location === 'local' ? this.local : this.cloud;
		if (!ds) throw new Error(`The ${location} data set is not available`);
		return ds;
	}
}
