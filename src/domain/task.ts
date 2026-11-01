export type TaskStatus = "open" | "done";
export type TaskPriority = "low" | "medium" | "high";

export interface Task {
  id: number;
  title: string;
  status: TaskStatus;
  priority?: TaskPriority;
  /** Calendar date `YYYY-MM-DD` (local). Absent when the task has no due date. */
  dueDate?: string;
  /** Lowercase tags, sorted and de-duplicated. Absent when the task has no tags. */
  tags?: string[];
  createdAt: string;
  completedAt?: string;
}

export interface TaskList {
  version: 1;
  nextId: number;
  tasks: Task[];
}

export function emptyList(): TaskList {
  return { version: 1, nextId: 1, tasks: [] };
}

export function addTask(list: TaskList, title: string, now: Date, priority: TaskPriority = "medium", dueDate?: string, tags: readonly string[] = []): Task {
  const trimmed = title.trim();
  if (trimmed === "") throw new Error("Task title cannot be empty.");
  const task: Task = { id: list.nextId, title: trimmed, status: "open", priority, createdAt: now.toISOString() };
  if (dueDate !== undefined) task.dueDate = dueDate;
  if (tags.length > 0) task.tags = normaliseTags(tags);
  list.tasks.push(task);
  list.nextId += 1;
  return task;
}

export function completeTask(list: TaskList, id: number, now: Date): Task {
  const task = list.tasks.find((t) => t.id === id);
  if (!task) throw new Error(`No task with id ${id}.`);
  if (task.status !== "done") {
    task.status = "done";
    task.completedAt = now.toISOString();
  }
  return task;
}

export const PRIORITIES: readonly TaskPriority[] = ["high", "medium", "low"];

export function parsePriority(value: string | undefined): TaskPriority {
  if (value === "low" || value === "medium" || value === "high") return value;
  throw new Error("Invalid priority. Valid levels: low, medium, high.");
}

/** Tasks written before priorities existed read as medium. */
export function priorityOf(task: Task): TaskPriority {
  return task.priority ?? "medium";
}

export function setPriority(list: TaskList, id: number, priority: TaskPriority): { task: Task; previous: TaskPriority } {
  const task = list.tasks.find((t) => t.id === id);
  if (!task) throw new Error(`No task with id ${id}.`);
  const previous = priorityOf(task);
  task.priority = priority;
  return { task, previous };
}

/** Overdue = open, with a due date strictly before `today` (`YYYY-MM-DD`). Done tasks are never overdue. */
export function isOverdue(task: Task, today: string): boolean {
  return task.status === "open" && task.dueDate !== undefined && task.dueDate < today;
}

/**
 * Overdue tasks first (oldest due date, then id), then other open tasks
 * (high → medium → low, then id), done tasks last (by id).
 * Without `today`, nothing is treated as overdue.
 */
export function sortTasks(tasks: readonly Task[], today?: string): Task[] {
  const overdue = (t: Task) => today !== undefined && isOverdue(t, today);
  const rank = (t: Task) => (overdue(t) ? -1 : t.status === "done" ? PRIORITIES.length : PRIORITIES.indexOf(priorityOf(t)));
  const byDue = (a: Task, b: Task) => (overdue(a) && overdue(b) ? a.dueDate!.localeCompare(b.dueDate!) : 0);
  return [...tasks].sort((a, b) => rank(a) - rank(b) || byDue(a, b) || a.id - b.id);
}

/** Set (`YYYY-MM-DD`) or clear (`undefined`) a task's due date. */
export function setDueDate(list: TaskList, id: number, dueDate: string | undefined): { task: Task; previous: string | undefined } {
  const task = list.tasks.find((t) => t.id === id);
  if (!task) throw new Error(`No task with id ${id}.`);
  const previous = task.dueDate;
  if (dueDate === undefined) delete task.dueDate;
  else task.dueDate = dueDate;
  return { task, previous };
}

const pad = (n: number) => String(n).padStart(2, "0");

/** The local calendar date of `d` as `YYYY-MM-DD`. */
export function localDate(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** Parse `YYYY-MM-DD`, `today` or `tomorrow` (relative to the local date of `now`) into `YYYY-MM-DD`. */
export function parseDueDate(value: string | undefined, now: Date): string {
  if (value === "today") return localDate(now);
  if (value === "tomorrow") return localDate(new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1));
  const m = value === undefined ? null : /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (m) {
    const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
    const date = new Date(y, mo - 1, d);
    if (date.getFullYear() === y && date.getMonth() === mo - 1 && date.getDate() === d) return value!;
  }
  throw new Error(`Invalid due date${value === undefined ? "" : ` "${value}"`}. Use YYYY-MM-DD, today, or tomorrow.`);
}

const TAG = /^[a-z0-9][a-z0-9-]*$/;

/**
 * Parse tag arguments: each value may hold several comma-separated tags.
 * Tags are lowercased; each must be letters, digits and hyphens (not starting with a hyphen).
 */
export function parseTags(values: readonly string[]): string[] {
  const tags = values.flatMap((v) => v.split(",")).map((t) => t.trim().toLowerCase());
  for (const t of tags) {
    if (!TAG.test(t)) throw new Error(`Invalid tag "${t}". Tags are single words of letters, digits and hyphens, e.g. work or side-project.`);
  }
  return normaliseTags(tags);
}

/** Sorted, de-duplicated copy. */
export function normaliseTags(tags: readonly string[]): string[] {
  return [...new Set(tags)].sort();
}

/** Add (`remove = false`) or remove tags on a task. Removing the last tag drops the field. */
export function changeTags(list: TaskList, id: number, tags: readonly string[], remove = false): Task {
  const task = list.tasks.find((t) => t.id === id);
  if (!task) throw new Error(`No task with id ${id}.`);
  const current = task.tags ?? [];
  const next = remove ? current.filter((t) => !tags.includes(t)) : normaliseTags([...current, ...tags]);
  if (next.length === 0) delete task.tags;
  else task.tags = next;
  return task;
}
