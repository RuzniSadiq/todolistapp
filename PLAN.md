# PLAN — todolistapp v0.2: prioritise and filter

Goal (owner): "a todo CLI where I can add, list, complete and prioritise tasks."
Shipped in v0.1: `add`, `list [--json]`, `done <id>`, `help`.

## 1. Task priority (storage)
Tasks carry an optional `priority` of `high | medium | low`. Files written by
v0.1 (no field) still load; a missing priority reads as `medium`.
- AC1.1 A v0.1 task file without `priority` loads and lists unchanged.
- AC1.2 `todo add --priority high <title>` stores `priority: "high"`; without the flag, `medium`.
- AC1.3 An invalid level (`--priority urgent`) exits 1 with a message listing valid levels; nothing is written.

## 2. Prioritise command + priority ordering
- AC2.1 `todo prioritise <id> <high|medium|low>` updates the task and prints the change.
- AC2.2 Unknown id or level exits 1 with a message; the file is unchanged.
- AC2.3 `todo list` shows open tasks first, ordered high → medium → low, then by id; done tasks last.
- AC2.4 Human-readable list marks priority (`!` high, blank medium, `↓` low); `--json` includes `priority`.

## 3. List filters
- AC3.1 `todo list --open` shows only open tasks; `--done` only completed ones.
- AC3.2 Filters combine with `--json`.
- AC3.3 `--open --done` together exits 2 with a usage message.

## Out of scope
Due dates, tags, editing titles, deleting tasks, sync, any runtime dependency.

---

# PLAN — v0.3: due dates and overdue first

Owner (2026-11-01): "let me add due dates to tasks and show overdue ones at the top."

## 4. Due date (storage)
Tasks carry an optional `dueDate` (`YYYY-MM-DD`, a calendar date, no time). v0.2 files still load.
- AC4.1 `todo add --due 2026-11-15 <title>` stores `dueDate: "2026-11-15"`; `--due today` / `--due tomorrow` resolve against the local date.
- AC4.2 An invalid date (`--due 2026-02-30`, `--due someday`) exits 1 with a message showing the accepted forms; nothing is written.
- AC4.3 A v0.2 task file without `dueDate` loads and lists unchanged; `TaskList.version` stays 1.

## 5. Change due date + overdue ordering
- AC5.1 `todo due <id> <date|today|tomorrow|none>` sets or clears the due date and prints the change.
- AC5.2 Unknown id or invalid date exits 1; the file is unchanged.
- AC5.3 Overdue = open task with `dueDate` before today's local date. Due today is not overdue; done tasks are never overdue.
- AC5.4 `todo list` shows overdue tasks first (oldest due date first, then id), then other open tasks in the v0.2 order, then done tasks.
- AC5.5 Human list shows the due date and an `OVERDUE` marker; `--json` includes `dueDate` and `overdue: true|false`.
- AC5.6 `todo help` documents `--due` and `todo due`.

## Out of scope
Times of day, reminders/notifications, recurring tasks, a `--overdue` filter.
