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
  - Every agent commit carries `Agent-Vendor: <vendor>` (plus `-s`). If one slips, post the Gibson attestation comment on the PR at the exact head (`docs/fleet-review-conventions.md`): `<!-- owner-review-attestation:v1` / `head-sha: <40 hex>` / `author-vendor: claude` / `-->`. Never rewrite/force-push to add the trailer (force-push is Gibson "Never allow", G3).
  - Tier C floor is Gibson D-015: fan-out cross-vendor review at the exact head + required checks; no owner approval. Sources (The-AIE/the-gibson @ `babef4b`): `memory/DECISIONS.md` D-015 (2026-10-09: "requires E3 … plus the repository's required checks, and no owner review, approval, attestation, label or merge action"); `AGENTS.md` Risk tiers row C ("Fan-out + adversarial review + G12 floor (E3 at the exact head + required checks, D-015)"); `playbooks/release.md` pre-merge item 5 ("Do not queue this for Mark"). This repo's AGENTS.md Tier C row ("owner approval") predates D-015, and this repo's AGENTS.md header says the Gibson wins on conflict. Updating that row is an owner decision; until then, and with no Devin merge captain, the owner still performs the merge.
  - With no Devin merge captain wired, the final merge is the owner's (gibson-run default). Agents do not merge, force-push, delete remote branches, or edit their own permission settings.
  - Draft PR bodies keep `claim.sh`'s markers (`- Active-work claim:`, `- Claim scope:`, `- Issue: #N`) so `release-claim.sh` can release the claim.
  - Before removing a loop worktree, back up its git-ignored `gibson/journal.md`, `gibson/loop-state.md`, `.gibson-receipts/`.
- **Links:** #11, #13
