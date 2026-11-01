export type TaskStatus = "open" | "done";
export type TaskPriority = "low" | "medium" | "high";

export interface Task {
  id: number;
  title: string;
  status: TaskStatus;
  priority?: TaskPriority;
  /** Calendar date `YYYY-MM-DD` (local). Absent when the task has no due date. */
  dueDate?: string;
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

export function addTask(list: TaskList, title: string, now: Date, priority: TaskPriority = "medium", dueDate?: string): Task {
  const trimmed = title.trim();
  if (trimmed === "") throw new Error("Task title cannot be empty.");
  const task: Task = { id: list.nextId, title: trimmed, status: "open", priority, createdAt: now.toISOString() };
  if (dueDate !== undefined) task.dueDate = dueDate;
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

/** Open tasks first (high → medium → low, then id), done tasks last (by id). */
export function sortTasks(tasks: readonly Task[]): Task[] {
  const rank = (t: Task) => (t.status === "done" ? PRIORITIES.length : PRIORITIES.indexOf(priorityOf(t)));
  return [...tasks].sort((a, b) => rank(a) - rank(b) || a.id - b.id);
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
