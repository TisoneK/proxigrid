# Current Task (overwrite each session)

Holds exactly one task — the one being worked on right now. Set it at
session start (protocol Step 3), clear it at session end (Step 15). If
you find a stale in-progress entry here, a prior session died mid-task —
its roster row (if left behind) says who was here; check the session
entry and backlog before starting.

<!-- TEMPLATE — replace everything below this comment:
- **Session:** YYYY-MM-DD — <agent> / <model>
- **Task:** <what is being worked on right now>
- **Status:** in-progress | done | blocked (<blocker>)
-->

- **Session:** 2026-09-13 — ZCode / 18ae0130-10c3-4a72-ac96-e46e6f4b7bc0/qwen3.8-flash (Vera / S069)
- **Task:** sync context — migrate vendored core 0.8.0 → 1.0.6 (`.context/` → `.context_ledger/` rename, office regroup, entry-point regeneration, instruction sweep)
- **Status:** in-progress
