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
