#!/usr/bin/env node
import { addTask, completeTask, type TaskPriority } from "../domain/task.ts";
import { defaultStorePath, load, save } from "../infrastructure/store.ts";

const HELP = `todo — a local command-line todo list

Usage:
  todo add [--priority <low|medium|high>] <title...>    Add a task
  todo list [--json]     List tasks
  todo done <id>         Mark a task as done
  todo help              Show this help

Tasks are stored in $TODO_FILE (default ~/.todolistapp/tasks.json).`;

export interface Io {
  out: (line: string) => void;
  err: (line: string) => void;
  env: NodeJS.ProcessEnv;
  now: () => Date;
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
          const value = titleParts[priorityIndex + 1];
          if (value !== "low" && value !== "medium" && value !== "high") {
            throw new Error("Invalid priority. Valid levels: low, medium, high.");
          }
          priority = value;
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
        if (rest.includes("--json")) {
          io.out(JSON.stringify(list.tasks));
        } else if (list.tasks.length === 0) {
          io.out("No tasks yet. Add one with: todo add <title>");
        } else {
          for (const t of list.tasks) io.out(`${t.status === "done" ? "[x]" : "[ ]"} #${t.id} ${t.title}`);
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
