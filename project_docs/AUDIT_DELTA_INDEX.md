# Audit family navigation index

This file is **navigation only**. Current P-code status and single-owner authority come from `AUDIT_REGISTRY.md`. Detailed source proof is retained in consolidated family evidence files and Git history.

## Consolidation state

All formerly current `AUDIT_DELTA_*.md` evidence files have completed lossless family retirement. The original source text is preserved verbatim in the relevant `AUDIT_FAMILY_*_EVIDENCE.md` file (or the cross-cutting evidence file), together with original filename and SHA-256 where applicable.

No standalone audit delta is a current status authority. New audit findings must first be registered in `AUDIT_REGISTRY.md`; if a temporary delta is created during active analysis, CI requires it to be indexed until it is folded into the appropriate family evidence.

## Current temporary audit deltas

- `AUDIT_DELTA_SELECTION_CAPTURE_FIDELITY_2026-08-29.md`

  PDF/print + frame selection fidelity. Registered scope: P0-004 ACTIVE refinement; new P1-226 ACTIVE. Durable supporting summary: `AUDIT_SELECTION_CAPTURE_FIDELITY_EVIDENCE.md`. Supporting dedup/refinement evidence also covers P0-067/P1-212, P1-003, P1-187, P2-006 and P2-007.

## Supplemental durable audit evidence

- `AUDIT_INTERACTIVE_CAPTURE_FRAME_TOPOLOGY_EVIDENCE.md`

  24-block interactive-capture/live-frame-topology/renderer-state audit tranche. Registered scope: new P1-227 ACTIVE for bounded live same-origin frame topology during manual selection. Supporting refinements/controls cover P0-004, P0-066, P0-068, P0-071, P0-075, P1-160, P1-187, P1-213, P2-006 and P2-007; cross-origin topology remains with the existing frame lifecycle owners.

## Families

| # | Family | Consolidated evidence | Primary owners / scope | Retired deltas |
|---:|---|---|---|---:|
| 1 | Backup / scheduler / remote recovery generation | `AUDIT_FAMILY_BACKUP_RECOVERY_GENERATION_EVIDENCE.md` | P1-076, P1-077, P1-117, P1-177, P1-184, P1-194, P1-207, P1-208, P1-210, P0-074. | 25 |
| 2 | Yandex auth / config / immutable operation context / Settings UI | `AUDIT_FAMILY_YANDEX_AUTH_CONFIG_EVIDENCE.md` | P0-074, P0-078, P1-157, P1-158, P1-165, P1-175, P1-178, P1-184, P1-195, P1-196, P1-210, P1-222, P1-223. | 24 |
| 3 | Yandex remote object identity / move / publication / destructive lifecycle | `AUDIT_FAMILY_YANDEX_REMOTE_IDENTITY_EVIDENCE.md` | P0-022, P0-040, P0-069, P0-072, P0-073, P0-074, P0-078, P1-090, P1-164, P1-175, P1-184, P1-210. | 21 |
| 4 | Backup restore/import from Yandex | `AUDIT_FAMILY_BACKUP_RESTORE_EVIDENCE.md` | P0-013, P0-022, P0-073, P0-074, P1-035, P1-069, P1-184, P1-210, P1-215. | 4 |
| 5 | Journal import / provenance / portable schema / legacy identity | `AUDIT_FAMILY_JOURNAL_IMPORT_PROVENANCE_EVIDENCE.md` | P0-013, P0-022, P0-073, P0-076, P0-077, P1-030, P1-035, P1-042, P1-069, P1-206, P1-211, P1-215, P1-216. | 15 |
| 6 | Journal read/view revision / pagination / open/apply / bulk authority | `AUDIT_FAMILY_JOURNAL_VIEW_AUTHORITY_EVIDENCE.md` | P0-076, P0-080, P1-001, P1-009, P1-175, P1-206, P1-210. | 18 |
| 7 | Journal comments / tombstones / edit generations | `AUDIT_FAMILY_JOURNAL_COMMENTS_EVIDENCE.md` | P0-076, P1-202, P1-211, P1-225 | previously consolidated |
| 8 | Operation receipt / OperationLog / user reconciliation | `AUDIT_FAMILY_OPERATION_RECEIPTS_EVIDENCE.md` | P1-145, P1-197, P1-198, P1-205, P1-210 and durability/maintenance owners. | 15 |
| 9 | Local download / native Save As / file settlement | `AUDIT_FAMILY_LOCAL_DOWNLOAD_SAVEAS_EVIDENCE.md` | P0-039, P1-079, P1-080, P1-087, P1-129, P1-146, P1-156, P1-169, P1-210. | 12 |
| 10 | Chrome/MV3 APIs / browser-owned state / extension-page transport | `AUDIT_FAMILY_CHROME_MV3_SETTLEMENT_EVIDENCE.md` | P1-123…P1-131, P1-157, P1-158, P1-166, P1-170, P1-173, P1-203, P1-204, P1-209, P1-210, P1-217. | 17 |
| 11 | Frame permission / cross-origin frame-agent identity and command generation | `AUDIT_FAMILY_FRAME_PERMISSION_IDENTITY_EVIDENCE.md` | P1-004, P1-157, P1-171, P1-193, P1-199…P1-203, P1-214. | 12 |
| 12 | PDF/print / offscreen resource lifetime / live-DOM rollback / source generation | `AUDIT_FAMILY_PDF_PRINT_OFFSCREEN_EVIDENCE.md` | P0-004, P0-003, P0-023, P0-063, P0-065, P0-067, P0-068, P0-070, P0-071, P0-075, P0-080, P1-003, P1-069, P1-149…P1-153, P1-160, P1-167, P1-187, P1-199, P1-212…P1-214, P1-218…P1-224, P1-226, P1-227. | 26 |
| 13 | Incognito / trust boundaries / signed-link redaction | `AUDIT_FAMILY_PRIVACY_TRUST_EVIDENCE.md` | P0-033, P0-045 | previously consolidated |
| 14 | Derived URL stats / view indexes | `AUDIT_FAMILY_URLSTATS_EVIDENCE.md` | P0-050 | previously consolidated |
| 15 | Retired broad revalidation / cross-cutting inventories | `AUDIT_CROSSCUTTING_REVALIDATION_EVIDENCE.md` | cross-cutting historical controls | previously consolidated |

## Current reading rule

1. Read `AUDIT_REGISTRY.md` for current status and ownership.
2. Use the family evidence above and supplemental durable evidence for detailed source proof, deterministic schedules, corrections, positive controls and acceptance boundaries.
3. Use `AUDIT_HISTORY_INDEX.md`, `AUDIT_EVIDENCE.md`, `AUDIT_RETIRED_DELTA_EVIDENCE.md`, `TEST_EVIDENCE.md` and Git history for historical implementation/test context.
4. Never infer that a P-number is free from absence in one family document; permanent numbering rules in `AUDIT_REGISTRY.md` control allocation.