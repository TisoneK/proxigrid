# CLAUDE.md — read this first, every session

## FIRST ACTION (non-negotiable, before any edit)

This repo runs the `.context_ledger/` protocol. **Before writing, editing, or
running anything for the task, your literal first actions are:**

1. **Read `.context_ledger/kickoff.md` and follow it** (Step 0 → Step 1).
2. **Sync:** `git pull --ff-only`, then read
   `.context_ledger/memory/workflows/active.md` (standing params + push policy),
   `.context_ledger/memory/agents/sessions.md` (last 3–5 entries — the real HEAD
   and session number live here, *not* in the harness's start-of-session
   git snapshot, which can be several sessions stale), and
   `.context_ledger/memory/tasks/current.md`.
3. **Set the task** in `.context_ledger/memory/tasks/current.md` before the first edit.

Do this even for a task that looks like a trivial one-liner. Skipping it
is a logged protocol failure — see `.context_ledger/memory/flaws/log.md`
(2026-09-03, Session 55: an entire session ran with zero `.context_ledger/`
discipline until the user had to ask "did you push as per protocol?").

## Non-negotiables during the session

- **Commit each logical change and `git push origin main` after each commit.**
  Push policy is "push to `main` after each commit" — don't wait to be asked.
  If the user has to remind you to commit or push, the protocol has failed.
- **Commit style:** Conventional Commits with scope. Use `chore(context):`
  for `.context_ledger/` changes and `docs(review):` for reports — never mix a
  `.context_ledger/` change and product code in one commit.
- **After any `git pull` that touches `prisma/schema.prisma`, run
  `npx prisma generate`** before trusting tsc/build (the committed client
  is otherwise stale — see `.context_ledger/memory/inefficiencies/log.md`).
- **Gates** (`.context_ledger/memory/workflows/gates.conf`): `pre-commit`,
  `integration`, and `exit` are mandatory. Practically: `npx tsc --noEmit`,
  `npm run lint`, `npx vitest run`, `npm run build` must be green.

## Exit

Complete the EXIT checklist in
`.context_ledger/core/rules/ai-engineering-protocol-local.md` (Step 19): all work
committed **and pushed**, session logged in
`.context_ledger/memory/agents/sessions.md` + `sessions/SUMMARY.md`,
`tasks/current.md` back to idle, chat summary delivered.

---

More detail lives in [`AGENTS.md`](AGENTS.md) and the vendored protocol at
`.context_ledger/core/`. This file exists so the kickoff read is the first thing
that happens, not the thing that gets skipped.
