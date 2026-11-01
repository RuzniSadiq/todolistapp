#!/usr/bin/env node
import { addTask, changeTags, completeTask, isOverdue, localDate, parseDueDate, parsePriority, parseTags, priorityOf, setDueDate, setPriority, sortTasks, type Task, type TaskPriority } from "../domain/task.ts";
import { defaultStorePath, load, save } from "../infrastructure/store.ts";

const HELP = `todo — a local command-line todo list

Usage:
  todo add [--priority <high|medium|low>] [--due <date>] [--tag <tag>]... <title...>
                                                       Add a task (default: medium)
  todo list [--open | --done] [--tag <tag>] [--json]   List tasks, most important first
  todo done <id>                                       Mark a task as done
  todo prioritise <id> <high|medium|low>               Change a task's priority
  todo due <id> <date|none>                            Set or clear a task's due date
  todo tag <id> <tag...>                               Add tags to a task
  todo untag <id> <tag...>                             Remove tags from a task
  todo help                                            Show this help

<tag> is a word of letters, digits and hyphens (e.g. work); repeat --tag or
use commas (--tag work,home) for several.
<date> is YYYY-MM-DD, today, or tomorrow. Open tasks due before today are
OVERDUE and listed first.

Tasks are stored in $TODO_FILE (default ~/.todolistapp/tasks.json).`;

export interface Io {
  out: (line: string) => void;
  err: (line: string) => void;
  env: NodeJS.ProcessEnv;
  now: () => Date;
}

const MARKER: Record<TaskPriority, string> = { high: "!", medium: " ", low: "↓" };

function formatTask(t: Task, today: string): string {
  const tags = t.tags?.length ? ` [${t.tags.join(", ")}]` : "";
  const due = t.dueDate === undefined ? "" : ` (due ${t.dueDate}${isOverdue(t, today) ? ", OVERDUE" : ""})`;
  return `${t.status === "done" ? "[x]" : "[ ]"} ${MARKER[priorityOf(t)]} #${t.id} ${t.title}${tags}${due}`;
}

function parseSingleTag(value: string | undefined): string {
  const tags = parseTags([value ?? ""]);
  if (tags.length !== 1) throw new Error("Usage: todo list --tag <tag> (one tag)");
  return tags[0]!;
}

export function run(argv: string[], io: Io): number {
  const [command, ...rest] = argv;
  const path = defaultStorePath(io.env);
  try {
    switch (command) {
      case "add": {
        const titleParts = [...rest];
        const takeOption = (name: string): string | null => {
          const i = titleParts.indexOf(name);
          if (i === -1) return null;
          const [, value] = titleParts.splice(i, 2);
          return value ?? "";
        };
        const priorityArg = takeOption("--priority");
        const priority: TaskPriority = priorityArg === null ? "medium" : parsePriority(priorityArg);
        const dueArg = takeOption("--due");
        const tagArgs: string[] = [];
        for (let tagArg = takeOption("--tag"); tagArg !== null; tagArg = takeOption("--tag")) tagArgs.push(tagArg);
        const tags = parseTags(tagArgs);
        const now = io.now();
        const dueDate = dueArg === null ? undefined : parseDueDate(dueArg, now);
        const list = load(path);
        const task = addTask(list, titleParts.join(" "), now, priority, dueDate, tags);
        save(path, list);
        io.out(`Added #${task.id}: ${task.title}`);
        return 0;
      }
      case "list": {
        const onlyOpen = rest.includes("--open");
        const onlyDone = rest.includes("--done");
        if (onlyOpen && onlyDone) {
          io.err("Usage: todo list [--open | --done] [--json] (choose one of --open or --done)");
          return 2;
        }
        const tagIndex = rest.indexOf("--tag");
        const tag = tagIndex === -1 ? undefined : parseSingleTag(rest[tagIndex + 1]);
        const list = load(path);
        const today = localDate(io.now());
        const tasks = sortTasks(list.tasks, today)
          .filter((t) => (onlyOpen ? t.status === "open" : onlyDone ? t.status === "done" : true))
          .filter((t) => tag === undefined || (t.tags ?? []).includes(tag));
        if (rest.includes("--json")) {
          io.out(JSON.stringify(tasks.map((t) => ({ ...t, priority: priorityOf(t), tags: t.tags ?? [], overdue: isOverdue(t, today) }))));
        } else if (list.tasks.length === 0) {
          io.out("No tasks yet. Add one with: todo add <title>");
        } else if (tasks.length === 0 && tag !== undefined) {
          io.out(`No ${onlyOpen ? "open " : onlyDone ? "completed " : ""}tasks tagged ${tag}.`);
        } else if (tasks.length === 0) {
          io.out(onlyOpen ? "No open tasks." : "No completed tasks.");
        } else {
          for (const t of tasks) io.out(formatTask(t, today));
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
      case "due": {
        const id = Number(rest[0]);
        if (!Number.isInteger(id) || id < 1) throw new Error("Usage: todo due <id> <YYYY-MM-DD|today|tomorrow|none>");
        const dueDate = rest[1] === "none" ? undefined : parseDueDate(rest[1], io.now());
        const list = load(path);
        const { task, previous } = setDueDate(list, id, dueDate);
        save(path, list);
        io.out(`Due #${task.id}: ${previous ?? "none"} → ${dueDate ?? "none"} (${task.title})`);
        return 0;
      }
      case "tag":
      case "untag": {
        const usage = `Usage: todo ${command} <id> <tag...>`;
        const id = Number(rest[0]);
        if (!Number.isInteger(id) || id < 1 || rest.length < 2) throw new Error(usage);
        const tags = parseTags(rest.slice(1));
        const list = load(path);
        const task = changeTags(list, id, tags, command === "untag");
        save(path, list);
        io.out(`Tags #${task.id}: ${task.tags?.join(", ") ?? "none"} (${task.title})`);
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
