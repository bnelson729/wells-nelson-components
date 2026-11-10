/** Mock data for the sandbox pages. Everything here is made up. */

export interface Person {
	id: string;
	name: string;
	email: string;
	active: boolean;
}

export const people: Person[] = [
	{ id: 'p1', name: 'Avery Brooks', email: 'avery@example.com', active: true },
	{ id: 'p2', name: 'Blake Chen', email: 'blake@example.com', active: true },
	{ id: 'p3', name: 'Casey Diaz', email: 'casey@example.com', active: true },
	{ id: 'p4', name: 'Devon Ellis', email: 'devon@example.com', active: false },
	{ id: 'p5', name: 'Emery Fox', email: 'emery@example.com', active: true },
	{ id: 'p6', name: 'Finley Grant', email: 'finley@example.com', active: false }
];

export interface MemberStats {
	id: string;
	name: string;
	assigned: number;
	done: number;
	/** Percent done; null when nothing is assigned. */
	donePct: number | null;
	overdue: number;
	avgDays: number | null;
}

export const stats: MemberStats[] = people.map((p, i) => {
	const assigned = [12, 7, 0, 9, 15, 4][i];
	const done = [9, 7, 0, 3, 11, 1][i];
	return {
		id: p.id,
		name: p.name,
		assigned,
		done,
		donePct: assigned ? Math.round((done / assigned) * 100) : null,
		overdue: [1, 0, 0, 4, 2, 1][i],
		avgDays: assigned ? [2.5, 1.8, 0, 4.1, 3.0, 6.2][i] : null
	};
});

export type Status = 'todo' | 'doing' | 'done';

export interface Task {
	id: string;
	title: string;
	status: Status;
	assignee: string;
}

export const statuses: { id: Status; name: string }[] = [
	{ id: 'todo', name: 'To do' },
	{ id: 'doing', name: 'In progress' },
	{ id: 'done', name: 'Done' }
];

export const tasks: Task[] = [
	{ id: 't1', title: 'Audit current pages', status: 'done', assignee: 'p1' },
	{ id: 't2', title: 'Draft new navigation', status: 'doing', assignee: 'p2' },
	{ id: 't3', title: 'Write copy for home page', status: 'todo', assignee: 'p3' },
	{ id: 't4', title: 'Pick a photo set', status: 'todo', assignee: 'p5' },
	{ id: 't5', title: 'Book the venue', status: 'doing', assignee: 'p1' },
	{ id: 't6', title: 'Order supplies', status: 'todo', assignee: 'p2' },
	{ id: 't7', title: 'Send invitations', status: 'todo', assignee: 'p5' },
	{ id: 't8', title: 'Set up the donation page', status: 'done', assignee: 'p3' }
];

export const tags = [
	{ id: 'g1', label: 'Design' },
	{ id: 'g2', label: 'Engineering' },
	{ id: 'g3', label: 'Events' },
	{ id: 'g4', label: 'Marketing' }
];

/** Resolve after a short delay, like a network call. */
export const delay = <T>(value: T, ms = 300) => new Promise<T>((r) => setTimeout(() => r(value), ms));
