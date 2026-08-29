# Documentation consistency audit — current-authority overrides

This document records current-authority corrections where large historical project documents still contain statements superseded by newer explicit architecture/audit decisions. It is not a new product backlog and allocates no P-numbers.

When one of the exact topics below is encountered, this document plus `AUDIT_REGISTRY.md`, current family/delta evidence and runtime source override the older descriptive paragraph until the large document is deliberately rewritten from current source.

## 1. Recovery archive inside every extension build — SUPERSEDED

Historical text remains in `USER_REQUIREMENTS.md`, `TEST_PLAN.md` and an older section of `DECISIONS_AND_RATIONALE.md` saying that every extension ZIP must contain a full recovery ZIP/source snapshot.

That policy is **no longer current**. P0-019 is `SUPERSEDED` in `AUDIT_REGISTRY.md` by the explicit Git-first recovery architecture:

- exact Git commit SHA is the canonical WIP source snapshot;
- exact release commit + annotated release tag identify a released source state;
- user-facing extension ZIP does not require a nested full source/recovery ZIP;
- optional recovery ZIP is a separate offline/disaster artifact derived only from a clean exact commit;
- release/recovery assets use explicit SHA-256 manifests.

Current authority: `BUILD_AND_RECOVERY_RULES.md`, `GITHUB_WORKFLOW.md`, `RESTORE_PROMPT.md`, `GITHUB_REPOSITORY_STATE.md`, `project_tools/build_recovery_archive.py` and `project_tools/test_recovery_archive.py`.

Therefore the old `TEST_PLAN.md` check "external ZIP contains recovery ZIP" must not be used as a release requirement. The current recovery test is provenance/hash/clean-tree validation of the separate artifact.

## 2. Yandex retry by `remotePath + exact size` — historical strategy is unsafe

`DECISIONS_AND_RATIONALE.md` contains an older decision saying a retry can treat an existing `remotePath` with matching byte size as the previously uploaded object and skip transfer.

Current audit owner **P1-184** explicitly rejects path+size as sufficient object/content proof. An unrelated same-sized file at the expected path must not be adopted, published or finalized as this operation's output.

Current contract requires an exact operation/content/object receipt: immutable local operation-owned bytes/content fingerprint plus remote object identity/proven transfer/reconciliation evidence. Unknown settlement remains `unknown`, not equivalent to "file absent" or "matching size proves success".

The old paragraph is retained only as historical rationale for why the retry mechanism was introduced, not as current correctness authority.

## 3. Journal read architecture — old dual-full-read description is historical

`ARCHITECTURE.md` still includes older wording in which Journal diagnostics/read behavior uses a direct IndexedDB full read plus a parallel service-worker full read and selects the more complete result.

That wording predates the bounded Journal-view work (including P1-032 historical implementation and current P1-206 revision-coherence owner). It must not be used to justify reintroducing multiple materialized full-Journal arrays.

Current rule:

- ordinary Journal views are bounded/paged/streamed according to current source;
- fallbacks/read paths must be bounded;
- a published composed view must carry one coherent Journal revision under P1-206;
- diagnostics cannot justify unbounded duplicate materialization.

Exact runtime source is authoritative until `ARCHITECTURE.md` is fully regenerated.

## 4. Cross-origin frame-agent restart semantics — not proven self-healing

`ARCHITECTURE.md` contains historical wording implying the in-memory frame-agent registry is automatically restored after MV3 worker restart by reinjection/re-registration.

Current owners **P1-203**, P1-171/P1-200 and related frame lifecycle deltas show this is not a proven current guarantee. A renderer frame agent can survive while worker memory is lost; restart needs explicit re-handshake/reconcile-or-cleanup with exact child document/permission/session generation.

Do not cite the old architecture sentence as evidence that worker restart recovery is already solved.

## 5. Print disclosure controls — product requirement does not authorize page behavior

`USER_REQUIREMENTS.md`, `ARCHITECTURE.md`, `DECISIONS_AND_RATIONALE.md` and `TEST_PLAN.md` correctly preserve the user goal that useful collapsed content should be present in the PDF where safely possible.

However current **P0-067/P1-212** boundaries mean this requirement must **not** be implemented/interpreted as permission to synthetic-click arbitrary page-owned accordion/toggle/submit/link controls.

Current safe interpretation:

- native/static state that can be exposed without executing host behavior may be temporarily represented for print;
- printable representation should be inert and rollback-safe;
- content requiring a real page/user action should be requested from the user or represented without invoking application behavior;
- no save/print operation gains authority to execute host submit/navigation/business logic merely to reveal content.

## 6. Temporary DOM rollback descriptions are conditional, not unconditional guarantees

Older architecture/decision prose says temporary links, image wrappers, frame styles and resource attributes are restored "exactly" after print.

Current owners P1-218…P1-224 prove several rollback paths are stale-writer risks when the host page changes the same DOM after WebClip's temporary mutation. The required rule is **compare-before-restore / exact generated-node or private receipt ownership**, not blind restoration of an old snapshot over newer host state.

The user-facing goal remains no persistent WebClip damage to the page, but old prose must not be read as evidence that current implementation already meets generation-safe rollback.

## 7. Large canonical documents: editing policy

The large historical documents remain useful for product rationale and chronology. They should not be mechanically rewritten from the active P backlog because that risks turning open audit findings into asserted architecture.

For future cleanup:

1. regenerate each affected section from current runtime source;
2. distinguish `current implemented behavior`, `accepted architecture target`, and `open audit owner`;
3. remove a consistency override from this file only after the large document no longer makes the stale claim;
4. use repository consistency/CI to prevent retired filenames and source-of-truth models from returning.

## Audit result

The stale statements above are now explicitly non-authoritative. No runtime implementation status was changed by this documentation audit, and no historical test result was promoted to a current PASS.
