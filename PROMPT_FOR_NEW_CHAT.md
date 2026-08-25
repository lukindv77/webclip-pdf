# Prompt for a new ChatGPT chat — WebClip PDF

Continue development and audit of the private GitHub repository `lukindv77/webclip-pdf` (Chrome Manifest V3 extension WebClip PDF Prototype).

## Source of truth

Use **GitHub `main` as the canonical working state**. Do not reconstruct the project from memory or rewrite it from scratch. At the beginning of the chat:

1. Read `handoff/LATEST.md`.
2. Read `handoff/CURRENT_STATE_2026-08-25_1605.md`.
3. Read this file, `PROJECT_RECOVERY.md`, `QA_STATUS_0_9_9.md`, `README.md`, and relevant `P*-*_CLOSURE.md` / `STATIC_CHECKS_*.md` files before changing code.
4. Confirm the current `main` HEAD and compare it with the checkpoint recorded in `handoff/LATEST.md`.
5. Inspect the actual implementation and tests for the task being worked on; historical task text is not sufficient evidence that something is physically present or closed.

Repository: `lukindv77/webclip-pdf`
Branch: `main`
Manifest: **MV3 / 0.9.8**. Do **not** bump to `0.9.9` until real release QA is completed and the user explicitly asks for a new build/release.

## Current verified checkpoint

The source snapshot used for the published 0.9.8 build is `a704b2a2ca9977c0515cec3fd7a6b5563be285e5` (`sync: initialize current WebClip WIP through P1-080`). Subsequent GitHub commits only published build/release artifacts and handoff metadata/workflows; they did not change production source code.

Latest requested GitHub pre-release:
- tag: `v0.9.8-build-20260825-1442`
- title: `WebClip 0.9.8 build 2026-08-25 14:42`
- ZIP SHA-256: `cd40a7d248936015e629aaef134004ef14ee422230e54ffac6e912ceb29521a4`
- release target/source snapshot: `a704b2a2ca9977c0515cec3fd7a6b5563be285e5`

Latest full local gate before that build:
- JavaScript syntax: **68/68 PASS**
- deterministic `project_tools/test_*.js`: **55/55 PASS**
- managed Chromium integration: PASS
- selected-only PDF on the build gate run: **37,601 bytes**
- Journal: PASS
- mocked Yandex flow: PASS
- manifest JSON/MV3: PASS; version remains `0.9.8`

Real unpacked unmanaged Chrome + real Yandex OAuth/API/upload/move/backup remains the release-QA boundary before any `0.9.9` claim.

## Closed / regression-protected work that must not be reopened without a new reproduction

At minimum: P0-003 regression fix, P0-014, P0-037 and other security/audit closures documented in the repo; P1-001, P1-003, P1-004, P1-007, P1-008, P1-009, P1-025, P1-026, P1-027, P1-028, P1-030, P1-032, P1-074, P1-079, P1-080, P1-090, P1-145, P1-146 and other entries explicitly marked `REGRESSION` in the current audit documents.

Do not assign a new P-code to a newly reproduced defect that is clearly inside an already closed task/change area; fix it under the existing task unless the registry requires a new code.

## Open physical-closure backlog

P0: no currently open tasks. History reserves P0-058…P0-062; do not reuse them. Next genuinely new P0 after registry verification: **P0-063**.

Primary P1 physical-closure backlog:
- **P1-081** — make normal OperationLog v2 IDB operations (`append/mutate/list/get/clear`) bounded/abortable.
- **P1-084** — bounded/abortable CRUD for the PDF retry cache.
- **P1-085** — deadline/abort for direct readonly IndexedDB reading in `journal.html` with normal service-worker fallback.
- **P1-124** — bounded `tabs.create()` plus duplicate protection for late settlement.
- **P1-125** — bounded `scripting.executeScript()`; late injection must remain singleton-safe.
- **P1-126** — close remaining unwrapped `tabs.get()` paths in the service worker.
- **P1-128** — deadline for offscreen idle-close runtime message plus correct cleanup rescheduling.
- **P1-129** — serialization / late-settlement barrier for prepared Save-As checkpoint mutation.
- **P1-130** — deadlines/fencing/global pending cap for Chrome Action API.
- **P1-131** — account for unknown/late `debugger.attach/detach` settlement in the global PDF pending budget.

Registry reconciliation still required:
- **P1-138…P1-141** have a conflict between canonical runtime-task history and later alias functionality; do not renumber or silently reconcile them.
- **P1-142…P1-144** are history-reserved / physically represented but canonical reconciliation is still pending.
- **P1-145** is reconciled and closed as `REGRESSION`.
- Next genuinely new P1 after registry verification: **P1-147**.

Open P2 product backlog:
- **P2-001** HTML/Markdown export.
- **P2-002** user-selected local folder.
- **P2-003** task/tracker integrations.
- **P2-004** tags/categories/extended metadata.
- **P2-005** full-text search.
- **P2-006** selection scope inside Shadow DOM.
- **P2-007** multiple snapshot/export formats.
- **P2-008** advanced health/storage telemetry.

P2-009…P2-013 are history-reserved/implemented audit identifiers and must not be reused. Next genuinely new P2 after registry verification: **P2-014**.

## Architecture and security invariants — preserve these

- Yandex OAuth access token is session-only; no refresh token persistence.
- Legacy local token cleanup is awaited and fail-closed.
- OAuth uses PKCE S256 and explicit trust boundaries.
- Incognito data must not silently become persistent browsing history.
- Yandex managed paths are canonicalized and destructive operations fail closed on account/root/resource identity mismatch.
- Durable checkpoints exist for local downloads, Yandex saves, backup execution/recovery and import/replace operations; timeout is not assumed to cancel Chrome/API side effects.
- Blob/PDF retry resources and offscreen resources have bounded lifecycle/budgets and cleanup.
- Journal/OperationLog/IDB operations must be bounded; late settlements require reconciliation/fencing rather than blind retry.
- OperationLog v2 is append-only/auditable except for explicitly documented bounded maintenance semantics.
- Imported metadata, selection snapshots and resource diagnostics remain bounded and sanitized.
- Full PSL handling and alarm-based maintenance behavior must remain intact.
- Cross-origin iframe support requires granted optional host permissions and frame-agent/service-worker trust checks; host permission does not bypass SOP in the top page.
- `saveAs:true` native dialogs are owned by visible extension pages (`journal.html`/`options.html`), not by the MV3 service worker; do not add caller timeout/retry around the user-owned native dialog.

## Git/GitHub working policy requested by the user

Do **not** commit every small edit. Accumulate related code/test/docs/harness changes and sync to GitHub as one meaningful commit or a small coherent series only when:
- a task is fully completed;
- a large intermediate stage has a self-contained result; or
- an important checkpoint is required before a risky next stage.

Small harness/docs/manifest/intermediate fixes belong in the same task/checkpoint commit.

A new build or GitHub Release is created **only on explicit user request**. Do not bump the manifest merely because code changed.

A new handoff archive/prompt for another chat is created and uploaded **only on explicit user request**. This handoff is such an explicitly requested checkpoint.

## Workflow for the next task

Before starting a new P-task, give the user a short Russian `Справка` describing the problem, affected subsystem, risks/invariants, and planned proof of closure. Then inspect the physical code and tests, implement the change without rewriting the architecture, run targeted regression plus the full deterministic gate, and only at task/major-checkpoint completion sync the coherent result to GitHub.

Do not claim release/DONE status from local deterministic/browser-mock evidence alone. Preserve the real Chrome/Yandex release-QA gate.
