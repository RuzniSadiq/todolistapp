export type TaskStatus = "open" | "done";
export type TaskPriority = "low" | "medium" | "high";

export interface Task {
  id: number;
  title: string;
  status: TaskStatus;
  priority?: TaskPriority;
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

export function addTask(list: TaskList, title: string, now: Date, priority: TaskPriority = "medium"): Task {
  const trimmed = title.trim();
  if (trimmed === "") throw new Error("Task title cannot be empty.");
  const task: Task = { id: list.nextId, title: trimmed, status: "open", priority, createdAt: now.toISOString() };
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
