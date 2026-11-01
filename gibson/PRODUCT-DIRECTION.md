# Product direction — todolistapp

Owner's standing decisions. `gibson-direct` appends every new product decision
here (dated, in the owner's words) so the fleet never asks the same question twice.

## Goal
A todo CLI where I can add, list, complete and prioritise tasks.

## Users
One person on their own machine, working in a terminal.

## Out of scope (until the owner says otherwise)
- Network sync, accounts, sharing, telemetry
- Web or GUI front ends
- Runtime npm dependencies
- Publishing to npm

## Standing taste rules
- Output is short and plain; every list command has a `--json` form for scripts.
- Errors say what went wrong and what to type instead; non-zero exit codes on failure.

## Decisions log
- 2026-11-01 — Goal set: "a todo CLI where I can add, list, complete and prioritise tasks." (from the setup doc)
- 2026-11-01 — Priority levels are `high / medium / low`; new tasks default to `medium`; `list` orders open tasks by priority then id, done tasks last. (Default proposed by the orchestrator on the owner's "do it quickly" instruction — owner may veto.)
- 2026-11-01 — Repo is public on GitHub (owner choice).
- 2026-11-01 — Owner: "let me add due dates to tasks and show overdue ones at the top." Approved defaults: due dates are calendar dates (`YYYY-MM-DD`, `today`, `tomorrow`), set via `add --due` and changed/cleared via `todo due <id> <date|none>`; overdue = open and due before today (local); overdue tasks list first, oldest due date first, then the existing priority order; done tasks never overdue. No times, reminders, recurrence, or `--overdue` filter.
- 2026-11-01 — Owner: "Let me tag tasks with one or more labels like work or home when I add them or later." Approved defaults: tags are lowercase words (letters, digits, hyphens), stored sorted and de-duplicated; set via `add --tag` (repeatable or comma-separated), changed via `todo tag <id> <tag...>` / `todo untag <id> <tag...>`; list shows `[home, work]` after the title; `list --tag <tag>` filters (owner chose to include the filter). No renaming, tag listing, or multi-tag filter logic.
- 2026-11-02 — Owner: "allow users to search tasks by their title." Approved defaults: `todo list --search <text>`, case-insensitive substring match on the title only, keeps list order, combines with `--open`/`--done`/`--tag`/`--json`; no matches prints `No tasks match "<text>".` No regex, fuzzy, or multi-term search.
