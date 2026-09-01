# Flaws Log (append-only — flows to the protocol package)

Friction caused by the `.context/` system or the protocol itself. See
`README.md` in this directory for the split between `flaws/` and
`inefficiencies/`.

<!-- TEMPLATE — copy below the last entry:
---
## YYYY-MM-DD — <agent> / <model> (Session N)

- **Flaw:** <what in the protocol or .context/ system didn't work>
- **Symptom:** <what happened to the agent — the observable friction>
- **Root cause:** <why the protocol/.context/ let this happen>
- **Suggested fix:** <concrete change to the package — a step, a pitfall,
  a template, a rule>
- **Status:** open | fixed in package <commit-sha or date>
-->

---
## 2026-09-02 — ZCode / glm-5.3-flash (Session 52)

- **Flaw:** `context-sync verify` false-fails on Windows checkouts with `core.autocrlf=true`.
- **Symptom:** Every core file reported FAILED against MANIFEST.sha256 immediately after a clean `git pull` on a fresh Windows machine; the prescribed rollback would have "restored" a core that was not corrupt.
- **Root cause:** The MANIFEST hashes were generated at bootstrap on macOS (LF). `autocrlf=true` checks files out with CRLF, so on-disk bytes can never match, content-intact. Verified: `git cat-file blob HEAD:.context/core/VERSION | sha256sum` equals the MANIFEST hash for spot-checked files — only the working-copy line endings differ.
- **Suggested fix:** (a) verify against git-normalized content (`git cat-file blob`) instead of the working tree, or (b) ship a `.gitattributes` in the package bootstrap with `.context/core/** eol=lf` (plus `--renormalize` guidance), and (c) add a Windows pitfall to the kickoff: verify failure + `autocrlf=true` + clean tree ⇒ check blob hashes before rolling back.
- **Status:** open

---
## 2026-09-02 — ZCode / glm-5.3-flash (Session 52)

- **Flaw:** `context-gates.ps1` (the Windows port of the gates helper) crashes on invocation.
- **Symptom:** `pwsh -File .context/core/bin/context-gates.ps1 run pre-commit` → `Cannot bind parameter because parameter 'PathType' is specified more than once.` No gate runs.
- **Root cause:** The .ps1 passes a value bound to a `-PathType`-style parameter twice in one call (works in the POSIX edition's loop; invalid in PowerShell parameter binding).
- **Suggested fix:** Fix the duplicated parameter in the port and add a CI smoke test that runs `verify`/`checkpoint`/`pre-commit` through both editions (sh + pwsh) so the ports can't silently diverge.
- **Status:** open

---
## 2026-09-02 — ZCode / glm-5.3-flash (Session 52)

- **Flaw:** The kickoff's Project Facts / environments say the repo is Windows-relevant now, but `kickoff.md`'s entry steps assume POSIX `sh` by default with the `.ps1` ports as the documented fallback — with no guidance for the common Windows case where Git Bash provides `sh`.
- **Symptom:** Agent had to discover that `sh .context/core/bin/context-gates` works fine under Git Bash after the `.ps1` port crashed (see flaw above); a future agent might assume gates are unavailable on Windows.
- **Root cause:** Docs treat Windows as "no POSIX shell", but Git Bash (extremely common on dev Windows boxes, and this repo's configured shell) supplies one.
- **Suggested fix:** Add one line to the kickoff Step 1/2 notes: "On Windows with Git Bash, the `sh` editions work as-is; prefer them over the .ps1 ports."
- **Status:** open
