import type { Member, MembersApi } from '../lib/account/types.js';

/** A members API that reads and writes reactive state when called, like a logging wrapper. */
export class ReactiveApi implements MembersApi {
	calls = $state<string[]>([]);
	constructor(private members: Member[]) {}

	#record(call: string) {
		this.calls = [...this.calls, call];
	}
	async fetchMembers(containerId: string) {
		this.#record(`fetch ${containerId}`);
		return this.members;
	}
	async inviteMember() {}
	async removeMember() {}
}

/** Props whose `choice` a test can change from outside, as an app's form state would. */
export class ChoiceProps {
	choice = $state<{ id: string } | { newName: string } | null>(null);
	constructor(
		readonly label: string,
		readonly options: { id: string; label: string }[]
	) {}
}
