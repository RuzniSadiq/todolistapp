import type { Task } from "./task.ts";

export interface TaskStats {
  total: number;
  open: number;
  done: number;
  percentDone: number;
}

/** Summary counts for a future `todo stats` command. */
export function taskStats(tasks: readonly Task[]): TaskStats {
  const total = tasks.length;
  const done = tasks.filter((t) => t.status === "done").length;
  return { total, open: total - done, done, percentDone: Math.round((done / total) * 100) };
}
