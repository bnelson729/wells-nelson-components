/**
 * What the account and sharing components need from the app's sync layer. These are plain
 * interfaces so this package has no storage dependency; `@wells-nelson/data-storage`'s
 * `CloudSync` and members API satisfy them as they are.
 */

export type Role = 'viewer' | 'editor' | 'owner';

/** Where a container (project, list…) lives: only on this device, or synced to the cloud. */
export type ContainerLocation = 'local' | 'cloud';

/** Lowercase nouns for the app's container, e.g. `{ singular: 'project', plural: 'projects' }`. */
export interface Nouns {
	singular: string;
	plural: string;
}

export interface AccountUser {
	email?: string;
	user_metadata?: Record<string, unknown>;
}

/** Read-only sync status. */
export interface CloudStatus {
	/** False when the app runs local-only (no Supabase settings). */
	readonly configured: boolean;
	readonly user: AccountUser | null;
	/** The signed-in email, lowercased ('' when signed out). */
	readonly email: string;
	readonly online: boolean;
	/** A replication is transferring right now. */
	readonly active: boolean;
	/** Supabase dropped the session on its own; data is kept until the user signs in again. */
	readonly sessionExpired: boolean;
	readonly error: string | null;
	readonly lastSync: number | null;
	readonly hasAnyPending: boolean;
	/** Containers with local changes that haven't reached the cloud. */
	readonly pendingIds: string[];
	hasPending(containerId: string): boolean;
}

export interface AccountActions {
	signInWithGoogle(redirectTo: string): Promise<void>;
	/** Emails a magic sign-in link. */
	signInWithEmail(email: string, redirectTo: string): Promise<void>;
	signOut(): Promise<void>;
	forceResync(): Promise<void>;
}

export interface Member {
	id: string;
	email: string;
	/** True when the email belongs to a registered user; false means the invite is pending. */
	active: boolean;
	/** Present when the app uses roles. */
	role?: Role | null;
}

export interface MembersApi {
	fetchMembers(containerId: string): Promise<Member[]>;
	inviteMember(containerId: string, email: string, role?: Role): Promise<void>;
	removeMember(memberId: string): Promise<void>;
	setMemberRole?(memberId: string, role: Role): Promise<void>;
}

export const ROLE_OPTIONS: { value: Role; label: string }[] = [
	{ value: 'viewer', label: 'Viewer' },
	{ value: 'editor', label: 'Editor' },
	{ value: 'owner', label: 'Owner' }
];

export const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function capitalize(word: string) {
	return word.charAt(0).toUpperCase() + word.slice(1);
}

export function errorText(err: unknown) {
	return err instanceof Error ? err.message : String(err);
}
