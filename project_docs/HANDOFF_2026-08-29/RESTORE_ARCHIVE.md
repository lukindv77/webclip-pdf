# RESTORE HANDOFF CONTEXT

Canonical readable handoff files are stored directly in `project_docs/HANDOFF_2026-08-29/`.

The working repository does not embed a duplicate ZIP/base64 copy of this handoff. GitHub `main` at a fresh HEAD is the canonical source for runtime, project documentation and audit deltas; Git history preserves older handoff states.

For context restoration read these files directly:
- `START_PROMPT.md`
- `HANDOFF_CONTEXT.md`
- `RECENT_COMMITS.md`
- `RESTORE_ARCHIVE.md`

Control baseline before the 2026-08-29 handoff commits:
`e42e4bbb08f00b6717b59e3ec94693e03eb1cda6`

Always fetch the current `main` first. A newer `main` supersedes this handoff checkpoint.
