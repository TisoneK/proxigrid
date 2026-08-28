# Agent + Model Registry (update in place)

Which agents and models have worked on this repo — and what they've
shown they can and can't do here. Update your row each session (last
seen + session count); add a row if you're new. The Observations
section is how the user learns which agent to hand which task, and how
agents learn a predecessor's blind spots (and verify its work
accordingly).

<!-- TEMPLATE — one row per agent+model pair:
| <agent name> | <model id> | YYYY-MM-DD | YYYY-MM-DD | <count> |
-->

| Agent | Model | First seen | Last seen | Sessions |
|---|---|---|---|---|
| Claude Code | claude-opus-4-8 | 2026-08-26 | 2026-08-28 | 30 |

## Observations

- **Claude Code / claude-opus-4-8:** Bootstrapped `.context/` (core 0.8.0) into this repo. Repo had been checked out as `root`, blocking writes/commits until the user ran `sudo chown -R bao:staff`; git also needed a `safe.directory` exception. Git identity was unset and was configured repo-locally. (2026-08-26)

Concrete, evidence-based capabilities and limits — things demonstrated
in this repo's sessions, not marketing claims or self-assessment.
Update in place when a newer session contradicts an old observation.

<!-- TEMPLATE — one bullet per observation:
- **<agent> / <model>:** <what was observed — concrete and checkable, e.g. "Read tool truncates files >500 lines; needs offset/limit", "SSRF fix shipped with regression test, verified green"> (YYYY-MM-DD)
-->
