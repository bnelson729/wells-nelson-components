/**
 * Type-level check that the packages fit together: data-storage's sync engine and members API
 * satisfy the interfaces interactions' account components expect. Runs against the built
 * packages (`npm run build` first), so it checks what actually ships.
 */
import type { CloudSync, DocMap, Location, Role as StorageRole, SupabaseApi } from '@wells-nelson/data-storage';
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
