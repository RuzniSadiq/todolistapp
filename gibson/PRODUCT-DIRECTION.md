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
