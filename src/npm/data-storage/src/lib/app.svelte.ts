import type { DataSet } from './dataset.js';
import type { DocMap, Location } from './types.js';

/**
 * Holds the two data sets: `local` (this device only, never synced) is always open;
 * `cloud` exists only while signed in and replicates to Supabase.
 */
export class AppState<D extends DocMap> {
	local = $state.raw<DataSet<D> | null>(null);
	cloud = $state.raw<DataSet<D> | null>(null);
	ready = $state(false);
	fatal = $state<string | null>(null);

	dataSet(location: Location): DataSet<D> {
		const ds = location === 'local' ? this.local : this.cloud;
		if (!ds) throw new Error(`The ${location} data set is not available`);
		return ds;
	}
}
