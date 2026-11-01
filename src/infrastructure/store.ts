import { mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import { emptyList, type TaskList } from "../domain/task.ts";

export function defaultStorePath(env: NodeJS.ProcessEnv = process.env): string {
  return env.TODO_FILE ?? join(homedir(), ".todolistapp", "tasks.json");
}

export function load(path: string): TaskList {
  let raw: string;
  try {
    raw = readFileSync(path, "utf8");
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") return emptyList();
    throw err;
  }
  const data = JSON.parse(raw) as TaskList;
  if (data.version !== 1 || !Array.isArray(data.tasks)) {
    throw new Error(`Unrecognised task file format: ${path}`);
  }
  return data;
}

export function save(path: string, list: TaskList): void {
  mkdirSync(dirname(path), { recursive: true });
  const tmp = `${path}.tmp`;
  writeFileSync(tmp, JSON.stringify(list, null, 2) + "\n", "utf8");
  renameSync(tmp, path);
}
