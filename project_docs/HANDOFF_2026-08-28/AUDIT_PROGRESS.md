# AUDIT PROGRESS / CLASSIFICATION SNAPSHOT

This file is a handoff index, not a replacement for canonical `PRIORITIES_P0_P1_P2.md` or the individual `AUDIT_DELTA_*.md` evidence.

## High-value recent P0/P1 assignments/findings

### P0-080 — SPA / same-document application generation
Selection is not safely scoped only by browser `documentId`. A SPA can keep the same document while `pushState`/route mutation replaces the meaningful application subtree. Detached old Includes can remain counted/authorized while metadata/URL already describe route B. Selection/review/save must fence application generation and connected live selection state.

### P1-211 — deleted Journal comment lifecycle
Soft-deleted comments retain full text, remain searchable/exported/backed-up/imported and continue consuming comment count/text limits. Create/delete cycles can permanently exhaust active capacity without an explicit bounded retention/compaction policy.

### P1-212 — synthetic page-control activation during print preparation
Print prep must not call page-owned `control.click()` on heuristic disclosure controls; that can navigate, submit forms or execute arbitrary site handlers. Reveal content via inert/structural representation only.

### P1-213 — flattened same-origin iframe proxy must be inert
Removing `<script>` from a deep clone is insufficient; inline handlers, nested frames, object/embed/media/form semantics can remain active when inserted into live top DOM.

### P1-214 — remote-frame prepare/restore rollback ownership
Partial `prepare-print` success must immediately acquire rollback ownership per child. Do not clear restore receipts before exact restore settlement; unknown restore remains reconcileable.

### P1-215 — import staging confirmation lease
A staged backup shown in an active destructive confirmation cannot be silently deleted by generic 2h TTL while the page still offers Proceed. Active confirmation requires owner/lease semantics; orphan TTL remains for abandoned/crash state.

### P1-216 — legacy URL derived-identity parity
Supported legacy rows without persisted `urlKey` must behave consistently across view, template/list, scoped clear and stats. Current paths have had multiple mismatches; canonical identity fallback/backfill must be centralized.

### P1-217 — Chrome Action degraded truth
On URL/navigation generation change, failed/timeout Journal summary read must not leave badge/icon/title from previous URL as current truth. `unknown/degraded` differs from `zero entries`.

## Major existing owners repeatedly refined by recent audit

- P0-070: exact source/top document generation through command -> prepare -> debugger PDF.
- P0-074: immutable Yandex operation context (auth/account/root/config/publication generation).
- P0-076: exact Journal entry/data-set mutation generation/CAS; stale confirmations cannot retarget replacements.
- P0-078: publication authorization generation vs observed existing public state.
- P0-039/P0-048: exact local DownloadItem receipt; avoid filename/size heuristic authority.
- P0-022: imported/legacy Yandex locator/provenance is not destructive authority.
- P1-157/P1-210: extension-page side effects and lost outer results require actual settlement/reconciliation; no blind replay.
- P1-171/P1-175: exact child/top document authority for frame commands / Journal Apply/source context.
- P1-177/P1-178/P1-191: scheduler/auth/PKCE/manual-token generations.
- P1-184: exact remote object identity.
- P1-198: worker-issued operation receipt / terminal control capability.
- P1-206/P1-207: coherent Journal view/export/backup source revision generations.

## Recent correction that must be preserved

Backup lease audit correction (`a2871e2a...`): do **not** claim `ensureYandexFolderTree()` is unbounded. Current runtime has path <=2048, <=32 segments and an aggregate ~90s tree deadline (P1-034 positive control). The actual demonstrated lease-expiry composition is P1-076 + P1-158: unbounded auth/config Chrome Storage prerequisite can outlive the 10-minute lease before bounded network work starts.

## Audit hygiene

Before assigning any new P number:
1. search canonical priorities;
2. search all `AUDIT_DELTA_*.md` semantically, not only by exact wording;
3. inspect recent commits after the handoff baseline;
4. prefer refining existing owner if same root cause;
5. if a genuinely new number is assigned, never reuse it later.
