export type TodoItem = { id: string; title: string; status: 'pending' | 'running' | 'done' | 'failed' };
export function deriveTodos(input: { plan?: { steps: { key: string; title: string }[]; progress: { key: string; status: string }[] } | null; todos?: { content: string; status: string }[]; active?: boolean; spans?: { id: string; title: string; done: boolean }[] }): TodoItem[];
export function todoSummary(items: TodoItem[]): { done: number; total: number; allDone: boolean; current?: TodoItem };
