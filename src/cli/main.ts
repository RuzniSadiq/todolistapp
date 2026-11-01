#!/usr/bin/env node
import { addTask, completeTask, parsePriority, priorityOf, setPriority, sortTasks, type Task, type TaskPriority } from "../domain/task.ts";
import { defaultStorePath, load, save } from "../infrastructure/store.ts";

const HELP = `todo — a local command-line todo list

Usage:
  todo add [--priority <high|medium|low>] <title...>   Add a task (default: medium)
  todo list [--json]                                   List tasks, most important first
  todo done <id>                                       Mark a task as done
  todo prioritise <id> <high|medium|low>               Change a task's priority
  todo help                                            Show this help

Tasks are stored in $TODO_FILE (default ~/.todolistapp/tasks.json).`;

export interface Io {
  out: (line: string) => void;
  err: (line: string) => void;
  env: NodeJS.ProcessEnv;
  now: () => Date;
}

const MARKER: Record<TaskPriority, string> = { high: "!", medium: " ", low: "↓" };

function formatTask(t: Task): string {
  return `${t.status === "done" ? "[x]" : "[ ]"} ${MARKER[priorityOf(t)]} #${t.id} ${t.title}`;
}

export function run(argv: string[], io: Io): number {
  const [command, ...rest] = argv;
  const path = defaultStorePath(io.env);
  try {
    switch (command) {
      case "add": {
        const priorityIndex = rest.indexOf("--priority");
        let priority: TaskPriority = "medium";
        const titleParts = [...rest];
        if (priorityIndex !== -1) {
          priority = parsePriority(titleParts[priorityIndex + 1]);
          titleParts.splice(priorityIndex, 2);
        }
        const list = load(path);
        const task = addTask(list, titleParts.join(" "), io.now(), priority);
        save(path, list);
        io.out(`Added #${task.id}: ${task.title}`);
        return 0;
      }
      case "list": {
        const list = load(path);
        const tasks = sortTasks(list.tasks);
        if (rest.includes("--json")) {
          io.out(JSON.stringify(tasks.map((t) => ({ ...t, priority: priorityOf(t) }))));
        } else if (list.tasks.length === 0) {
          io.out("No tasks yet. Add one with: todo add <title>");
        } else {
          for (const t of tasks) io.out(formatTask(t));
        }
        return 0;
      }
      case "done": {
        const id = Number(rest[0]);
        if (!Number.isInteger(id) || id < 1) throw new Error("Usage: todo done <id>");
        const list = load(path);
        const task = completeTask(list, id, io.now());
        save(path, list);
        io.out(`Completed #${task.id}: ${task.title}`);
        return 0;
      }
      case "prioritise": {
        const id = Number(rest[0]);
        if (!Number.isInteger(id) || id < 1) throw new Error("Usage: todo prioritise <id> <high|medium|low>");
        const priority = parsePriority(rest[1]);
        const list = load(path);
        const { task, previous } = setPriority(list, id, priority);
        save(path, list);
        io.out(`Prioritised #${task.id}: ${previous} → ${priority} (${task.title})`);
        return 0;
      }
      case undefined:
      case "help":
      case "--help":
      case "-h":
        io.out(HELP);
        return 0;
      default:
        io.err(`Unknown command: ${command}\n\n${HELP}`);
        return 2;
    }
  } catch (err) {
    io.err(`Error: ${(err as Error).message}`);
    return 1;
  }
}

if (import.meta.main) {
  process.exitCode = run(process.argv.slice(2), {
    out: (l) => console.log(l),
    err: (l) => console.error(l),
    env: process.env,
    now: () => new Date(),
  });
}
