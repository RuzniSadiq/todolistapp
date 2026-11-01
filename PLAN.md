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

---

# PLAN — v0.4: tags

Owner (2026-11-01): "Let me tag tasks with one or more labels like work or home when I add them or later."

## 6. Tags (storage) — #16
Tasks carry an optional `tags` list, stored sorted and de-duplicated. v0.3 files still load.
Tag grammar: each value is split on commas; each item is trimmed and lowercased (input `Work` → `work`), then must match `^[a-z0-9][a-z0-9-]*$` (letters, digits, hyphens; no leading hyphen; trailing hyphen allowed). Empty items are invalid (`--tag ""`, `--tag ,`, `--tag work,,home`, `--tag work,`). The same grammar applies to `add --tag`, `todo tag`, `todo untag` and `list --tag`.
- AC6.1 `todo add --tag work --tag home <title>` (or `--tag work,home`) stores `tags: ["home", "work"]`.
- AC6.2 An invalid tag exits 1 with a message showing the allowed form; nothing is written.
- AC6.3 Without `--tag` no `tags` field is written; v0.3 files load unchanged; `TaskList.version` stays 1.

## 7. Tag/untag, show tags, filter by tag — #17
- AC7.1 `todo tag <id> <tag...>` adds tags; `todo untag <id> <tag...>` removes them (comma-separated values accepted, as for `--tag`); both are idempotent; removing the last tag drops the stored field.
- AC7.2 Unknown id or invalid/missing tag exits 1; the file is unchanged.
- AC7.3 Human list shows `[home, work]` after the title; `--json` always includes `tags`, projecting untagged/legacy tasks as `tags: []` (storage still omits the field).
- AC7.4 `todo list --tag work` (exactly one tag) filters to that tag, keeps the v0.3 order (overdue, then open by priority, then done), and combines with `--open`/`--done`/`--json`.
- AC7.5 `todo help` documents `--tag`, `todo tag`, `todo untag` and `list --tag`.

## Out of scope
Renaming tags, listing all tags, multi-tag filters (AND/OR), tag colours.
