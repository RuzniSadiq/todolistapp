# AGENTS.md — todolistapp

A local-first TypeScript command-line todo list (`todo add | list | done | help`).
Developed under The Gibson (stock flow). Where this file and the Gibson's
`AGENTS.md` disagree, the Gibson wins.

## Autonomous development contract

This repo is developed by both humans and coding agents. Any agent or harness
working here reads this section first and obeys it. It states repo facts, not
process doctrine — your harness supplies the process.

Machine-readable companion: `.agents/gate.json` (same commands, parseable).

### Shared agent memory

- **Read** root `MEMORY.md` at session start before mutating work.
- **Dual-write:** durable lessons go in `MEMORY.md`, not only in a local runtime store.
- **No CI loop for pure memory commits:** if a commit touches **only** `MEMORY.md`,
  do **not** run typecheck/lint/test/build and do **not** wait on product CI or
  review gates. Mixed memory + product code uses the normal green gate.
- **Append-only** by default; rebase/pull immediately before writing; on conflict
  in dated sections keep both sides. No secrets in memory files.

### Gate commands (the definition of "green" here)
```bash
npm run typecheck   # tsc --noEmit
npm run lint        # eslint .
npm test            # node --test --test-reporter=tap test/*.test.ts
npm run build       # tsc -p tsconfig.build.json → dist/
```
All must pass before any **product** commit, with **zero new failures versus the
branch point**. Pre-existing failures are recorded, not inherited and not hidden.
Pure memory-only commits are exempt. Keep the TAP reporter: CI's
`test-integrity` parses `# tests N` / `# skip N` from it.

### Ground rules for machine contributors
1. **Never mutate the shared checkout.** One task = one branch = one git worktree of your own.
2. **Claim before you touch.** `agent-claimed` label plus one
   `- Active-work claim: <slug>` line in the draft PR body (what the Gibson's
   `scripts/claim.sh` writes). Overlapping claim ⇒ stop and coordinate, never race.
3. **Never review or approve your own work.** An independent reviewer — ideally
   a different model — inspects the exact committed head, read-only.
4. **Acceptance criteria are the contract**, verified by a sensor (test, script, check), never by assertion.
5. **Report failures verbatim.** Never mark done what you did not verify.
6. **Clean up:** remove the worktree, delete the branch, release the claim.

### Risk tiers
| Tier | Paths | Merge |
|---|---|---|
| A | `src/cli/**`, `test/**`, docs | green checks + cross-vendor review ⇒ merge |
| B | `src/domain/**`, `src/infrastructure/**`, `package.json`, configs, >150 lines or >6 files | green checks + full-lens cross-vendor review ⇒ merge |
| C | storage file format (`src/infrastructure/store.ts` schema, `TaskList.version`), migrations, `.github/**`, `scripts/**`, `config/review-evidence.v1.json` | review **and** owner approval at the exact head |

### Hot files (single claimant, own PR)
| File | Rule |
|---|---|
| `src/domain/task.ts` (`TaskList` shape) + `src/infrastructure/store.ts` | storage format is additive-only; bump `version` only with a migration; Tier C |
| `package.json` | **no runtime dependencies**; dev deps only with justification; own commit |
| `.github/**`, `scripts/**`, `config/**` | CI + vendored Gibson sensors; Tier C; re-copy from the Gibson, don't hand-edit |
| `AGENTS.md` | owner-approved changes only |
| `MEMORY.md` | append-only lessons; pure updates skip CI |

### Framework warnings
- Node **≥ 22.18** runs `.ts` directly via type stripping (tests run on source, no build step).
- Relative imports **must** use the `.ts` extension; `rewriteRelativeImportExtensions` turns them into `.js` in `dist/`.
- `erasableSyntaxOnly` is on: **no `enum`, no `namespace`, no constructor parameter properties.** Use union types and plain fields.
- `verbatimModuleSyntax`: type-only imports need `import type` / `type` modifiers.

### Deployment truth (verified 2026-11-01)
- There is no hosted service. "Production" = the `dist/` build from `main`.
- Merge to `main` ⇒ nothing deploys automatically. Release check: `npm run build && npm run smoke`
  (smoke: add → list --json → done → help against `dist/cli/main.js` with a temp `TODO_FILE`).
- Preview deployments: none.

### Stop and ask a human for
- Money: none in product. Any paid service/API is a G5 gate.
- Auth and authorization boundaries: none (single-user local CLI).
- PII / consent: task titles stay on local disk (`$TODO_FILE`, default `~/.todolistapp/tasks.json`). **No network code, telemetry, or sync** without owner approval.
- Security boundaries: `.github/**`, `scripts/**`, `config/review-evidence.v1.json` (adding a reviewer login is always an owner decision).
- Destructive or irreversible data and schema operations: non-additive changes to the task file format; anything that deletes a user's task file.
- Secret values, publishing to npm, making the repo public.

### Commit and PR conventions
- `git commit -s` on every commit (DCO `Signed-off-by` trailer).
- Branch `gibson/<issue>-<slug>`; PR body contains `Closes #N` and the active-work claim line.
- Labels: `gibson`, `tier-a|b|c`, `P0|P1|P2`.
- Agents may merge Tier A/B only with green required checks and independent `review-evidence`; Tier C waits for the owner.
