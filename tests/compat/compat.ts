/**
 * Type-level check that the packages fit together: data-storage's sync engine and members API
 * satisfy the interfaces interactions' account components expect. Runs against the built
 * packages (`npm run build` first), so it checks what actually ships. Also that an app can describe
 * its documents with an `interface`.
 */
import type {
	CloudSync,
	DataSet,
	DocMap,
	Location,
	Role as StorageRole,
	SupabaseApi,
	SyncedStore,
	SyncedStoreConfig
} from '@wells-nelson/data-storage';
import type {
	AccountActions,
	CloudStatus,
	ContainerLocation,
	MembersApi,
	Role as UiRole,
	ShareModal
} from '@wells-nelson/interactions/account';
import type { ComponentProps } from 'svelte';

type Assert<T extends U, U> = T;
type Same<A, B> = [A] extends [B] ? ([B] extends [A] ? true : never) : never;

export type CloudIsStatus = Assert<CloudSync<DocMap>, CloudStatus>;
export type CloudIsAccount = Assert<CloudSync<DocMap>, AccountActions>;
export type ApiIsMembers = Assert<SupabaseApi, MembersApi>;
export type ShareModalTakesCloud = Assert<CloudSync<DocMap>, ComponentProps<typeof ShareModal>['cloud']>;
export const sameRoles: Same<StorageRole, UiRole> = true;
export const sameLocations: Same<Location, ContainerLocation> = true;

/** Documents described with interfaces, which have no index signature. */
interface ProjectDoc {
	id: string;
	name: string;
	updated_at: number;
}
interface TaskDoc {
	id: string;
	project_id: string;
	title: string;
	updated_at: number;
}
interface InterfaceDocs {
	projects: ProjectDoc;
	tasks: TaskDoc;
}
export type InterfaceConfig = SyncedStoreConfig<InterfaceDocs, 'projects'>;
export type InterfaceStore = SyncedStore<InterfaceDocs, 'projects'>;
export type InterfaceDataSet = DataSet<InterfaceDocs>;
