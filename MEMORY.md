# MEMORY.md — shared agent memory

**Read this early** in any coding, review, or merge session.
**Update it** when the same failure class appears twice (prefer a test/sensor over a long essay).

Keep this file short so every agent loads it. Expand long-form detail in optional
files under `memory/` if the index grows.

### Dual-write rule (mandatory)

Whenever an agent writes durable operational memory in a local runtime store,
**also write here** so other agents and machines share the same context.

### No CI loop for memory-only updates

Commits that touch **only** this file (and optional pure memory paths named in
`AGENTS.md`) do **not** require typecheck, lint, test, build, product PRs, or
required CI. Land the lesson on the default branch quickly.

Mixed memory + product code still uses the normal green gate.

Canonical convention: The Gibson `docs/24-agent-memory-conventions.md`
(copy at adoption; this file is owned by **this** repo thereafter).

_Last updated: 2026-11-01_

---

## Operating notes

| Topic | Rule |
|-------|------|
| Claims | `agent-claimed` label + `- Active-work claim: …` line in the draft PR body (`claim.sh`) |
| Green gate | See `AGENTS.md` / `.agents/gate.json` |
| Deploy | `main`; "production" = `npm run build` output in `dist/` + `npm run smoke` |

---

## Lessons (append-only)

### How to add a lesson

1. `git fetch && git rebase origin/main` (or equivalent).
2. Append a new dated section at the **bottom** — do not rewrite history.
3. Commit **only** memory files; skip the product CI loop.
4. Never put secrets, tokens, or Production connection strings here.

```markdown
## YYYY-MM-DD — <short-slug>

- **What happened:** …
- **Root cause:** …
- **Fix / rule:** …
- **Links:** issue/PR if any
```

---

## 2026-11-01 — adoption-seed

- Repo adopted Gibson agent-memory conventions (AGENTS memory block + this file).
- Pure memory commits skip the product green gate; dual-write is mandatory.

## 2026-11-01 — tier-c-merge-pr13

- **What happened:** PR #13 (Tier C, due dates) sat green-but-blocked: `review-evidence` failed `identity-unresolved: RuzniSadiq:owner-unvendored` because test commit `25f96f3` lacked an `Agent-Vendor:` trailer. A Codex (`codex`-vendor) approval cannot clear a trailerless owner commit; only an `independent` reviewer or an owner attestation can.
- **Root cause:** this repo has no `.githooks/`, so Gibson's `prepare-commit-msg` never stamps `Agent-Vendor:`; hand-made lane commits miss it. The PR body also lacked the `- Issue: #N` marker, which made `release-claim.sh` refuse.
- **Fix / rule:**
  - Every agent commit made under the owner identity (`RuzniSadiq`, as in this repo today) carries `Agent-Vendor: <vendor>` (plus `-s`); a commit under a listed lane-bot identity resolves to its vendor without the trailer (Gibson `docs/fleet-review-conventions.md`: "Agent commits name their vendor: lane-bot identity, or the owner identity with an `Agent-Vendor:` trailer"). If an owner-identity commit slips, post the Gibson attestation comment on the PR at the exact head: `<!-- owner-review-attestation:v1` / `head-sha: <40 hex>` / `author-vendor: claude` / `-->`. Source: Gibson `docs/fleet-review-conventions.md` ("unless the owner attests the vendor at the exact head. The coordinator posts this when it commits a lane"; "An attestation resolves identity only; it is never a review"). It is an identity statement (who wrote the code), not a review or approval, so it does not conflict with D-015 retiring owner sign-off; `scripts/pr-review-evidence.mjs` `resolveAuthors()` honours it. On #13 it fixed only the author-identity failure. The review evidence for #13 was the `todolistapp-codex-review` bot's APPROVE at the exact head plus the required checks. Never rewrite/force-push to add the trailer (force-push is Gibson "Never allow", G3).
  - Tier C floor is Gibson D-015: fan-out cross-vendor review at the exact head + required checks; no owner approval. Sources (The-AIE/the-gibson @ `babef4b`): `memory/DECISIONS.md` D-015 (2026-10-09: "requires E3 … plus the repository's required checks, and no owner review, approval, attestation, label or merge action"); `AGENTS.md` Risk tiers row C ("Fan-out + adversarial review + G12 floor (E3 at the exact head + required checks, D-015)"); `playbooks/release.md` pre-merge item 5 ("Do not queue this for Mark"). This repo's AGENTS.md Tier C row ("owner approval") predates D-015 and has not been reconciled with it; there is no tracked follow-up yet. Until the owner changes that row (an owner-only AGENTS.md edit), it stays this repo's documented Tier C rule.
  - D-015 does not require an owner merge. In this setup the owner merged #13 for operational reasons, not policy: Claude Code's auto-mode classifier blocks agent `gh pr merge`, force-push, remote branch deletion and self-edited permission settings, and no Devin merge captain is wired (gibson-run: the default Devin handoff "leaves the merge to a human"). Observation only: this entry does not grant any agent or identity merge authority; who may merge is set by Gibson's release role and this repo's branch protection.
  - Draft PR bodies keep `claim.sh`'s markers (`- Active-work claim:`, `- Claim scope:`, `- Issue: #N`) so `release-claim.sh` can release the claim.
  - Before removing a loop worktree, back up its git-ignored `gibson/journal.md`, `gibson/loop-state.md`, `.gibson-receipts/`.
- **Links:** #11, #13

## 2026-11-02 — behind-main-costs-a-rereview

- **What happened:** PR #33 (#31, `list --search`) was preflight READY with a Codex APPROVE, but `main` requires up-to-date branches and a docs-only PR (#32) had merged meanwhile, so the PR was BEHIND. Release synced (`git merge origin/main`, signed, `Agent-Vendor: claude`), which moved the head to `0003fca`; `review-evidence` pins approval to the exact head, so a second Codex review was needed before merge. One extra reviewer + release hat for zero product change.
- **Root cause:** branch protection "require up-to-date" + exact-head review evidence ⇒ any merge to `main` after review invalidates the approval. Merging a plan/docs PR while a feature PR is in review guarantees this.
- **Fix / rule:** before dispatching the reviewer, check `gh pr view N --json mergeStateStatus`; if `BEHIND`, sync first (merge, never force-push) so one review covers the final head. Avoid merging docs/plan PRs while a feature PR is between reviewer and release. When syncing, confirm `git diff <old> <new> -- src test` is empty and say so in the re-review request.
- **Smoke gotcha:** `TODO_FILE=$(mktemp)` gives an empty file → JSON parse error. Point `TODO_FILE` at a nonexistent path inside `mktemp -d` instead.
- **Links:** #31, #32, #33
