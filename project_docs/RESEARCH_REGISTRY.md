# Canonical research registry — WebClip

Canonical status baseline: `main` at/after `745207cb7886bbc6d9369bac7c527218e1aaf4ab`.

This file is the **single current authority for P-code ownership and status**. Detailed source proof, deterministic race schedules, corrections, positive controls and implementation acceptance are retained in consolidated `RESEARCH_FAMILY_*_EVIDENCE.md`, cross-cutting/history evidence and Git history.

## Status model

- **ACTIVE** — current source/research still has an unresolved acceptance contract. Historical implementation PASS does not close it.
- **IMPLEMENTED / RELEASE-REGRESSION** — the scoped implementation was proven at a historical engineering gate and no later unresolved refinement is currently registered; real applicable release regression may still be required.
- **DONE** — the specific item is closed by implementation plus the required direct verification and has not been reopened.
- **BACKLOG** — accepted P2/product/architecture work, not claimed implemented and not automatically a current release blocker.
- **MERGED → Px-nnn** — code remains permanently reserved, but a later owner is the single current root-cause authority.
- **SUPERSEDED** — the historical requirement was intentionally replaced by a newer explicit architecture/product rule. Code remains permanently reserved.

## Permanent numbering rule

Once assigned, a P-code is never reused even after DONE/MERGED/SUPERSEDED.

Absence from a compact table below **never means a number is free**. Before any new P-number, search current registry, remaining deltas/evidence and Git history.

Important preserved reservations:

- late `P0-079` and `P0-080` are occupied;
- historical recovery explicitly reserved `P1-072…P1-131` even where an old physical snapshot omitted rows;
- every `P1-195…P1-231` is occupied;
- `P2-009` and `P2-010` are explicitly history-reserved;
- all other codes ever present in the legacy priority registry/history remain permanently reserved.

## Default status for legacy assigned P0/P1 codes

For a historically assigned P0/P1 code **not** listed in ACTIVE/DONE/MERGED/SUPERSEDED below, canonical status is:

**IMPLEMENTED / RELEASE-REGRESSION**

This compact rule replaces hundreds of old `REGRESSION` rows without declaring them release-tested on the current HEAD. Historical implementation/browser/test evidence is in `RESEARCH_EVIDENCE.md` and `TEST_EVIDENCE.md`; exact old wording remains in Git history.

## P0 — current ACTIVE owners

| Code | Status | Single current owner / root cause |
|---|---|---|
| P0-004 | ACTIVE | Selected PDF fidelity must be complete and selection-bounded: ordinary page-owned ancestor layout/clipping/positioning/visual effects cannot truncate included descendants or inject unselected ancestor presentation into the saved copy. |
| P0-013 | ACTIVE | Restore/import selection authority must be bound to the exact explicitly selected backup object/staging receipt; old selection/file identity cannot silently retarget. |
| P0-022 | ACTIVE | Imported/legacy Yandex locator metadata is not destructive object provenance; remote destructive authority requires proven exact object identity. |
| P0-023 | ACTIVE | PDF retry cache must be exact source-document generation bound; same-URL reload/replacement cannot reuse an older document's PDF. |
| P0-045 | ACTIVE | Incognito must remain fail-closed across persistent Journal/Action/popup/status surfaces; normal-profile state must not leak into private-tab UI/authority. |
| P0-050 | ACTIVE | Derived `urlStats` rebuild/publication needs a versioned generation isolated from concurrent point mutations. |
| P0-066 | ACTIVE | One durable/display URL confidentiality sanitizer must cover source URLs, locator URLs and imported/public metadata; secrets/userinfo/non-durable schemes cannot persist. |
| P0-069 | ACTIVE | Deleting a Journal entry with a public Yandex link requires an explicit publication outcome; preserve, durable `revoke + keep-file`, and the two-admission `revoke + Trash` protocol are implemented, while real-provider settlement evidence remains open. |
| P0-070 | ACTIVE | User save authority is exact full-document generation from command admission through print/cache/download/upload/Journal finalization. |
| P0-072 | ACTIVE | Bulk clear/replace cannot treat deletion of checkpoints as cancellation of already admitted non-cancellable external side effects. |
| P0-073 | ACTIVE | Remote-save completion/recovery is immutable account/root scoped; unresolved operation A cannot be rebound to account/root B. |
| P0-074 | ACTIVE | Long Yandex operation uses one immutable auth/account/root/config/publication operation context and generation; later stages cannot switch global context. |
| P0-075 | ACTIVE | Host page is not a trusted UI/control plane: sensitive input/selection/authorization state must not be host-readable or synthetic-event authorizable; print representation should be isolated. |
| P0-078 | ACTIVE | `createPublicLinks` is generation/revocation policy: disabling it forbids old not-yet-started publish authority without pretending an already-started unknown publish was cancelled. |
| P0-079 | ACTIVE | PDF bytes used for Yandex upload/retry must be immutable **operation-owned** cache generations, not one mutable `tab:<id>` slot. |
| P0-080 | ACTIVE | Same-document SPA/application generation and live selected DOM are separate from browser documentId; stale disconnected selection cannot authorize a save under a newer route/DOM. |

## P0 — special terminal state

| Code | Status | Resolution |
|---|---|---|
| P0-076 | DONE | Journal single-entry mutation authority is now exact row revision + dedicated Journal reset generation. Comments and local/keep delete use atomic CAS; ReadLater/Trash detached receipts persist and advance a separate local cursor through restart; import/clear establish fresh authority atomically; legacy verified no-cursor receipts fail closed to manual resolution; blind compatibility helpers have zero production callers; delayed append cannot overwrite an existing same-id replacement. See `RESEARCH_P0_076_SINGLE_ENTRY_GENERATION_CAS_CLOSURE_2026-09-18_EVIDENCE.md`. |
| P0-077 | DONE | Full-Journal self-export and same-version restore now share one versioned envelope: 50 MiB UTF-8 / 50 MiB chars / 100,000 entries / 8 MiB per serialized entry. Worker bootstrap clamps import options, replaces the legacy 4 MiB export batch reader with an 8 MiB envelope reader, and rejects + cleans staged export receipts above the same-version byte/count boundary before local/Yandex success. Existing records are neither deleted nor truncated. See `RESEARCH_P0_077_JOURNAL_RESTORE_ENVELOPE_CLOSURE_2026-09-01_EVIDENCE.md`. |
| P0-019 | SUPERSEDED | Historical rule “every user build contains a full recovery archive” was intentionally replaced on 2026-08-29 by Git-first recovery: exact commit SHA is canonical WIP snapshot, annotated release tag points to exact released commit, optional recovery ZIP is a separate offline artifact. See `BUILD_AND_RECOVERY_RULES.md`. |
| P0-033 | DONE | Signed Yandex Disk transport URLs are treated as opaque capabilities at the OperationLog boundary. A worker-only bootstrap guard wraps direct and nested log sanitization so `.disk.yandex.net` and `.disk.yandex.ru` host families retain only origin + `[REDACTED_SIGNED_PATH]`; deterministic failure/positive/negative/bootstrap controls passed at run `33469046270` / job `99734845451`. See `RESEARCH_P0_033_SIGNED_YANDEX_LOG_REDACTION_CLOSURE_2026-09-01_EVIDENCE.md`. |
| P0-039 | DONE | Unknown local-download outcomes no longer lose their only durable checkpoint when Chrome Download history disappears after 24 hours. Both unbound and bound TTL paths transition into a bounded `unknown` / `manual-resolution` state preserving metadata and operationId, skip ordinary retry batches, remain late-settlement resolvable, and never fabricate Journal success. Deterministic evidence passed at run `33469941122` / job `99737473577`. See `RESEARCH_P0_039_LOCAL_DOWNLOAD_UNKNOWN_RECOVERY_CLOSURE_2026-09-01_EVIDENCE.md`. |
| P0-048 | DONE | Automatic local-download fallback no longer assigns one physical `downloadId` by first-match filename/size heuristics. Exact Blob URL remains primary; fallback requires a unique candidate for the current intent and unique intent ownership for that candidate across the bounded active intent set. Numeric binding atomically refuses a different operation's existing owner instead of overwriting it. Deterministic committed-source evidence passed at run `33470987867` / job `99740532019`. See `RESEARCH_P0_048_LOCAL_DOWNLOAD_IDENTITY_CLOSURE_2026-09-01_EVIDENCE.md`. |
| P0-064 | DONE | Flattened same-origin iframe BODY is preflighted before complete `childNodes` materialization, the first deep clone and full source/target descendant arrays. Chrome for Testing 152 evidence at run `33466984058` / job `99728777166` proved an under-budget representation physically prints, while node/text/estimated-byte overflow stops at 5,001 / 2,000,001 / 8,388,609 respectively with zero deep-clone delta, no connected proxy and the original iframe still visible. Top-document and unmarked-frame DOM reads remain negative controls. The same job revalidated the preceding inertness closure under budget-first bootstrap. See `RESEARCH_P0_064_FRAME_PROXY_BUDGET_CLOSURE_2026-09-01_EVIDENCE.md`. |
| P0-065 | DONE | The three offscreen Blob-URL creation paths now reserve slot + bytes before the existing handler can materialize its Blob. Direct text uses exact pre-Blob UTF-8 byte counting, PDF/staged paths reserve conservative existing upper bounds, pending work shares the 12-slot / 256 MiB envelope with active URLs, and physical `URL.revokeObjectURL` releases guard accounting. Deterministic exact-source tests prove byte/count rejection before handler entry; Chrome for Testing 152 run `33468032924` / job `99731844838` proved 12 real Blob URLs succeed, request 13 is rejected by the pre-listener guard with `OFFSCREEN_BLOB_BUDGET_EXCEEDED`, and real revoke restores admission. Existing signed-transfer reservation remains independent and unchanged. See `RESEARCH_P0_065_OFFSCREEN_BLOB_ADMISSION_CLOSURE_2026-09-01_EVIDENCE.md`. |
| P0-067 | DONE | WebClip content-script injection installs an isolated-world host-control activation guard before `content.js`: page-owned programmatic `.click()` is blocked before native activation in top and accessible same-origin frame realms, while WebClip Shadow-DOM controls remain allowed and the page main world remains native. On fresh post-P0-033 baseline, Chrome for Testing 152 run `33469993760` attempt 2 / job `99737912236` proved the real PDF-preparation path has host `clicks=0` / `submits=0`, reaches one `WEBCLIP_GENERATE_PDF`, keeps the existing linked disclosure panel printable, and produces a one-page physical PDF with the disclosure sentinel; the integrated P0-033 regression also remained PASS. See `RESEARCH_P0_067_HOST_CONTROL_ACTIVATION_CLOSURE_2026-09-01_EVIDENCE.md`. |
| P0-068 | DONE | Flattened same-origin iframe print representation is made inert before live top-document insertion by an isolated-world inert-clone guard. Chrome for Testing 152 physical evidence at run `33465846960` / job `99725415291` proved native deep clone executes custom-element lifecycle, inline handler and nested iframe/object loads, while the guarded representation has zero active tags/handlers/duplicate identity/action attributes, zero host lifecycle/handler/nested/object deltas, preserves ordinary selected text/table content and Exclude semantics in a physical PDF, and does not patch the host main world. See `RESEARCH_P0_068_INERT_FRAME_PROXY_CLOSURE_2026-09-01_EVIDENCE.md`. |
| P0-071 | DONE | Actual `Page.printToPDF` representation is guarded at the render cut: page scripts are frozen, a bounded CDP DOM scan removes unsafe link schemes across top document/open Shadow/same-origin frame representation, safe links remain, live hrefs are restored before DOM teardown, and Chrome for Testing 152 physical PDF evidence at run `33463569910` / job `99718684840` proved hostile `beforeprint`, Shadow, frame and already-mutated `javascript:`/`data:` annotations do not reach the PDF. See `RESEARCH_P0_071_PRINT_RENDER_GUARD_CLOSURE_2026-09-01_EVIDENCE.md`. |

## P1 — current ACTIVE owners before late-number stream

| Code | Status | Single current owner / root cause |
|---|---|---|
| P1-001 | ACTIVE | SelectionSnapshot v3 restore must apply a truthful current rendered-target admission contract after structural matching; high locator score plus nonzero bbox cannot report success for hidden/fully transparent/otherwise non-admissible current nodes. |
| P1-003 | ACTIVE | PDF renderer-resource preparation must cover the actual selected visual resource graph under bounded deadlines, including pseudo/CSS visual resources and frame parity; `Page.printToPDF` completion is not resource-readiness proof, and bounded omissions must be truthful. |
| P1-004 | ACTIVE | Cross-origin iframe feature umbrella remains partial until exact child document/permission/session lifecycle owners are closed. |
| P1-008 | ACTIVE | User-settings import reconciliation marker needs immutable import generation/compare-and-remove; older reconciliation cannot consume a newer marker. |
| P1-009 | ACTIVE | Journal filter semantics work, but worst-case search over heavy payload is not bounded enough; needs scalable indexed/summary candidate strategy. |
| P1-035 | ACTIVE | Temporary transfer/import staging cleanup needs explicit live owner/lease/generation; TTL/quota-pressure cleanup cannot delete active visible/recovery state. |
| P1-043 | ACTIVE | Shared-origin storage preflight is snapshot-only; concurrent large writers require a global byte reservation/admission ledger. |
| P1-064 | ACTIVE | Local-download recovery must make bounded fair progress; old in-progress rows cannot indefinitely starve later terminal rows. |
| P1-076 | ACTIVE | Backup lease ownership is atomic but must remain valid for every stage that can later resume/publish side effects; lease expiry is not cancellation evidence. |
| P1-086 | ACTIVE | Readonly IndexedDB results across worker/offscreen contexts publish only after `tx.oncomplete`; request success followed by late abort/error is not committed data. |
| P1-090 | ACTIVE | Destructive Yandex move/reconciliation must prove the same exact remote object after unknown settlement; path/type/size or newly observed target id cannot substitute for source identity. |
| P1-124 | ACTIVE | `tabs.create` unknown/late settlement needs crash-recoverable/restart-safe exact generation reconciliation, not same-worker memory only. |
| P1-125 | ACTIVE | `executeScript` late-success receipt must be exact document generation bound; same-URL reload cannot consume old-document injection receipt. |
| P1-130 | ACTIVE | Chrome Action mutation admission/repair must remain bounded and converge after skipped/stale/late operations; later degraded truth is P1-217. |
| P1-138 | ACTIVE | Read-like Yandex list/fetch/status flows must not hide provisioning/mutation authority; pure observation must be separated from ensure/create side effects while keeping bounded UI reads. |
| P1-146 | ACTIVE | Automatic local-download start is non-cancellable browser side effect: exact durable intent/actual settlement/restart reconciliation must survive unknown response without duplicate start. |
| P1-150 | ACTIVE | Same-origin selected iframe print-height stabilization must not silently truncate admitted selected content at the `200000px` guard; over-bound content requires a complete bounded final representation or a truthful degraded/failed outcome instead of partial-PDF success. |
| P1-154 | ACTIVE | Aggregate live Include/Exclude count/byte budget must apply before local+remote materialization **and** portable snapshot serialization; UI/PDF/Journal scope cannot silently diverge through post-hoc 250-item slicing. |
| P1-156 | ACTIVE | Native Save As keeps user-owned unbounded dialog semantics while PREPARED/STARTED/RELEASE lifecycle, Blob pinning, exact DownloadItem reconciliation and owner-page/worker restart cleanup become durable/generation-exact. |
| P1-157 | ACTIVE | Extension/content Chrome calls need class-correct lifetime semantics; shared Settings writers need one ordering contract; user-owned permission prompt cannot be treated as cancelled by caller timeout. |
| P1-158 | ACTIVE | Pure Chrome/config/auth prerequisite reads need bounded deadlines included in parent operation; broad `getYandexConfig()` direct reads remain concrete coverage. |
| P1-160 | ACTIVE | Auto-content/page/frame/ad-suggestion discovery needs shared node/time/candidate budgets, bounded/coalesced interactive resolution and graceful manual fallback; discovery must not become quadratic or per-pointer unbounded work. |
| P1-161 | ACTIVE | Reauthorization needs bounded non-secret return-to-origin context and explicit manual resume; no automatic upload replay. |
| P1-162 | ACTIVE | Large Journal domain tree needs generation-fenced incremental rendering rather than one synchronous DOM construction. |
| P1-163 | ACTIVE | Streaming JSON parser should await only on chunk refill, not per character, while preserving all security/size/deadline limits. |
| P1-164 | ACTIVE | Standalone revoke, delete-time `revoke + keep-file`, and explicit two-effect `revoke + Trash` use durable phase/identity/Journal authority; admitted unpublish or move is never replayed. Manual-resolution now preserves the pre-manual remote phase and provides phase-specific operator guidance; live Yandex qualification remains required. |
| P1-165 | ACTIVE | OAuth state must be effectively verified from captured redirect (prefer `launchWebAuthFlow`); generating state without returned-state comparison is insufficient. |
| P1-166 | ACTIVE | Unique unresolved `executeScript`/`tabs.create` actual settlements need global admission cap without discarding actual-settlement ownership on local timeout. |
| P1-167 | ACTIVE | PDF preparation/diagnostic acquisition needs one shared node/time/mutation/string budget; bounded output alone is not bounded computation. |
| P1-168 | ACTIVE | Locator creation/scoring must avoid full sibling-array/string work; page-controlled selector inputs need early bounds. |
| P1-169 | ACTIVE | RELEASED prepared-Save-As tombstones need bounded retention/GC while preserving the late-generation barrier. |
| P1-170 | ACTIVE | Global Chrome Action refresh needs coalescing/generation, bounded tab discovery and bounded worker-pool fan-out. |
| P1-171 | ACTIVE | Cross-origin frame registry/list/commands require exact top/child document generation; reused frameId/same-URL reload cannot inherit authority. |
| P1-172 | ACTIVE | Save metadata/user inputs must be bounded/sanitized **before** print DOM and structured-clone IPC, with worker still authoritative second boundary. |
| P1-173 | ACTIVE | Serialized actual-settlement queues need waiting-turn admission/coalescing; one hung actual promise must not accumulate unbounded queued closures. |
| P1-174 | ACTIVE | Journal cards need lightweight summaries/lazy heavy details rather than eagerly materializing maximal comments/selection/resource DOM for 20 full entries. |
| P1-175 | ACTIVE | Journal Apply/page command must fresh-read source tab/site and exact document generation immediately before injection/send; stale context cannot retarget. |
| P1-176 | ACTIVE | Extension-page inputs need pre-IPC/maxLength validation matching worker limits; do not silently truncate secrets. |
| P1-177 | IMPLEMENTED / RELEASE-REGRESSION | Backup scheduler no-auth/user pause, proven-auth resume generation, exact alarm `(generation,dueAt)` receipts, callback/startup admission, per-remote-child generation/auth recheck and started-effect preservation are implemented; applicable real Chrome/Yandex release regression remains separate. |
| P1-179 | ACTIVE | Backup scheduler state and pending backup checkpoint are immutable account/root namespaces; old success/retry state cannot migrate into a new Yandex context. |
| P1-180 | ACTIVE | Bulk local destructive operations must disclose loss of control over existing public Yandex links; no hidden mass unpublish. |
| P1-182 | ACTIVE | Durable SelectionSnapshot locator context must not persist surrounding plaintext/sensitive raw href/src; preserve restore quality with privacy-preserving fingerprints. |
| P1-183 | ACTIVE | Delete→Trash needs durable exact source/target/object checkpoint before destructive move so crash/collision target is recoverable without blind second move. |
| P1-184 | ACTIVE | Unknown Yandex upload/reuse/recovery needs stronger exact object/content creation receipt; path+size cannot authorize adoption or publication. |
| P1-185 | ACTIVE | Imported temporal fields need finite/canonical timestamp domain and valid day-key normalization so hostile future/Infinity values cannot poison ordering/recovery/UI. |
| P1-186 | ACTIVE | Imported comment ids must be unique/addressable within an entry; duplicates require reject or deterministic collision-safe rewrite. |
| P1-187 | ACTIVE | Flattened iframe proxy must preserve required rendered state such as canvas bitmap under explicit node/pixel/byte budget. |
| P1-188 | ACTIVE | Imported locator cssPath must use versioned WebClip grammar or be ignored; arbitrary native selector semantics cannot be executed from backup. |
| P1-189 | ACTIVE | Imported hostname/site identity must be derived from normalized URL before privileged Yandex routing; duplicate raw hostname is not authority. |
| P1-190 | ACTIVE | Imported operationId is historical/unverified provenance and must not automatically link to an unrelated live local OperationLog record. |
| P1-192 | ACTIVE | Long alarm-started background operations need explicit MV3 lifecycle ownership **and durable fair progress across maintenance phases/wakes**. |
| P1-193 | ACTIVE | Optional host permission flow must preserve transient user activation: discovery first, separate immediate grant click, exact candidate document generation. |
| P1-194 | ACTIVE | Recovery durability class must be truthful about browser storage eviction; ordinary IDB commit cannot be reported as guaranteed recovery unless protection is proven. |

## P1 — merged code

| Code | Status | Resolution |
|---|---|---|
| P1-181 | MERGED → P1-209 | Both describe the same extension-page version-refresh root cause: success/version marker is committed before enumeration/reload/ack repair actually succeeds. P1-209 is the single current owner; P1-181 remains permanently reserved as historical duplicate. |
| P1-213 | MERGED → P0-068 | The narrower late wording “flattened same-origin iframe print proxy must be inert before live insertion” is the same root cause already owned by P0-068. Current Chrome 152 closure directly covers active nested browsing/plugin/custom-element/duplicate-identity behavior, so P0-068 is the single canonical owner and P1-213 remains permanently reserved. See `RESEARCH_P0_068_INERT_FRAME_PROXY_CLOSURE_2026-09-01_EVIDENCE.md`. |

## P1 — late current ACTIVE owners P1-195…P1-229

Every code in this range remains occupied. `P1-196` is `IMPLEMENTED / RELEASE-REGRESSION`; `P1-213` is `MERGED → P0-068` above; the remaining listed owners are ACTIVE.

| Code | Status | Single current owner / root cause |
|---|---|---|
| P1-195 | ACTIVE | Yandex capability truth: token presence/read success is not proof of all required Disk scopes; requested/granted/reduced/unknown capability states stay distinct. |
| P1-196 | IMPLEMENTED / RELEASE-REGRESSION | Exact OAuth-bound 401/known-expiry validity transitions, status axes, account-enrichment CAS and per-child recovery auth recheck are generation-fenced; stale auth A cannot demote or retarget newer auth B. Applicable live release regression remains separate. |
| P1-197 | ACTIVE | OperationLog administrative clear/delete needs durable history generation; late old writers cannot repopulate a cleared generation. |
| P1-198 | ACTIVE | Physical live operation identity is worker-issued; caller textual `operationId` is correlation metadata, not ownership capability. |
| P1-199 | ACTIVE | Cross-origin frame print prepare/restore state needs exact print-operation generation; stale restore cannot undo newer prepare. |
| P1-200 | ACTIVE | Remote-frame selection/control commands and responses need exact selection-session generation/ordering. |
| P1-201 | ACTIVE | Optional host-permission revoke/regrant must clean/fence already injected frame-agent authority and never revive old session state. |
| P1-202 | ACTIVE | Deleted-comment retention/privacy semantics must explicitly govern retained text, redisclosure and lifecycle. |
| P1-203 | ACTIVE | Injected frame-agent may outlive MV3 worker registry; new worker must re-handshake/reconcile/clean rather than infer authority. |
| P1-204 | ACTIVE | Browser-owned context-menu destructive rebuild needs generation durable across worker restart; old remove/create settlement cannot overtake new repair. |
| P1-205 | ACTIVE | OperationLog retention cleanup and queued writes need one history-generation linearization so late writer cannot resurrect expired history. |
| P1-206 | ACTIVE | One Journal composed view/page/group boundary must be exact source revision coherent; mixed A/B view cannot be baselined as current. |
| P1-207 | ACTIVE | Backup success/freshness must carry exact Journal source revision; finishing backup A after revision B exists does not protect B. |
| P1-208 | ACTIVE | Pending-remote recovery needs phase/status fairness; cheap `remote-verified` local finalization cannot starve behind older auth-blocked PREPARED rows. |
| P1-209 | ACTIVE | Extension-page version refresh requires pending/completed durable generation and truthful per-page repair/ack; pre-repair version marker is not success. |
| P1-210 | ACTIVE | Lost/rejected outer user-operation transport response means unknown; UI reconciles worker-issued durable receipt read-only instead of starting blind fresh operation. |
| P1-211 | ACTIVE | Deleted comment tombstones need one lifecycle across retention/search/export/import and portable capacity debt; deleted payload cannot consume active capacity forever. |
| P1-212 | ACTIVE | Print preparation must not synthesize activation of page-owned controls merely to reveal content. |
| P1-214 | ACTIVE | Multi-frame remote print prepare/restore needs exact partial-success rollback receipts and actual restore settlement per child/generation. |
| P1-216 | ACTIVE | Legacy and modern Journal rows share one derived URL identity domain for view/clear/delete/stats/templates; missing persisted urlKey cannot create ghost scope. |
| P1-217 | ACTIVE | Chrome Action requires explicit unknown/degraded truth; failed current read cannot leave previous URL's icon/badge/title on the tab. |
| P1-218 | ACTIVE | Temporary resource-attribute rollback (top + frame agent) is compare-before-restore and preparation-generation owned; stale cleanup cannot overwrite host changes. |
| P1-219 | ACTIVE | Temporary image-link wrapper structural rollback cannot reparent a page-owned image after host topology superseded WebClip's mutation. |
| P1-220 | ACTIVE | Print-header cleanup removes the exact generated node/receipt, not whatever fresh DOM node currently has the same textual id. |
| P1-221 | ACTIVE | Link-normalization rollback authority is private + exact temporary value/generation; host-mutable marker cannot authorize stale href restoration. |
| P1-222 | ACTIVE | Options async status/mutation completion is latest-user-edit-wins; stale completion cannot overwrite/clear a newer unsaved draft. |
| P1-223 | ACTIVE | Create Folder remote mutation target and UI browse-refresh authority are separate generations; late completion cannot supersede newer navigation. |
| P1-224 | ACTIVE | Same-origin frame/ancestor print style/marker rollback needs compare-before-restore; whole old style cannot overwrite newer host inline style. |
| P1-225 | ACTIVE | Journal comment editor must freeze or preserve newer draft after save admission; late success cannot silently destroy text typed while request was pending. |
| P1-226 | ACTIVE | Same-origin iframe selection geometry must compose content-box offsets and CSS transforms/zoom across every ancestor frame; simple child-rect plus frame-rect addition cannot drive outlines, usability, or overlap authority. |
| P1-227 | ACTIVE | Active manual selection must track bounded/coalesced same-origin frame topology changes: newly inserted/replaced/nested accessible frame documents become selectable without restart/auto-content, detached listeners are cleaned, and stale discovery cannot cross selection-session generation. |
| P1-228 | ACTIVE | Manual selection candidate/geometry authority must represent user-observable rendered intent rather than raw `event.target` plus one axis-aligned bbox: invisible interceptors/click-suppressed regions cannot decide commit, and fragmented/transformed/clipped/SVG geometry cannot create false outline/overlap authority; bounded candidate traversal is required. |
| P1-229 | ACTIVE | Cross-origin frame selected-only PDF representation needs one WebClip-owned media/geometry contract: worker screen-media emulation must not disable child Include/Exclude filtering or print screen-only selection decoration, and iframe print geometry must be measured from the same effective post-filter selected representation rather than pre-filter full-document height. |

P1-195's historical reconstruction source is Git commit `b2d9ec47833f00fc4b0b42923d1671ae20286f31`; detailed evidence for P1-196…229 is indexed in `RESEARCH_DELTA_INDEX.md` and remaining owner-specific deltas.

## P1 — current ACTIVE owners after P1-229

| Code | Status | Single current owner / root cause |
|---|---|---|
| P1-230 | ACTIVE | Current PDF capture must preserve bounded, generation-bound logical content actually materialized/seen through the user's own dynamic/virtualized scrolling up to the maximum user-reached boundary, including after scroll-back and DOM recycling, or truthfully report partial/degraded/unknown; current mounted DOM/window alone cannot silently substitute for that admitted history, and WebClip must not auto-scroll beyond the user's boundary. |
| P1-231 | ACTIVE | Release readiness/external QA authority must be bound to the exact tested package/runtime generation and applicable current release-contract generation. The 34-file RPF and 11-root full RCF (including the PSL generator executable) are now deterministic current authority, but current physical QA/governance receipts and release authorization remain required; older evidence cannot silently cross an affected identity axis. |

P1-230 is admitted from the 2026-08-30 C22/C23 contract tranche in `RESEARCH_USER_REACHED_DYNAMIC_SCROLL_2026-08-30_EVIDENCE.md`. Historical deferred/virtualized evidence intentionally left this code unallocated while current-view-vs-complete-logical semantics were still a P2-007 product question; `WEBCLIP_PDF_FIDELITY_CONTRACT.md` later explicitly resolved the current PDF contract in favor of bounded user-reached content preservation.

P1-231 is admitted from `RESEARCH_P1_231_RELEASE_EVIDENCE_GENERATION_2026-09-10_EVIDENCE.md`. Earlier history statements that left P1-231 unallocated applied to hover/disclosure/restore hypotheses already owned elsewhere; they do not reserve the number against this independent release-evidence authority root cause.

## DONE items explicitly retained

| Code | Status | Direct closure |
|---|---|---|
| P1-153 | DONE | Original `its.1c.ru` root-document pagination/clipping repro: real Chrome generated complete 2-page PDF after root print-flow normalization. Historical measurements are in `TEST_EVIDENCE.md` / `RESEARCH_EVIDENCE.md`. Later print-safety/rollback owners do not reopen that exact clipping result. |
| P1-215 | DONE | Journal import preview now owns exact raw staging through a durable v1 checkpoint: worker-issued receipt + rotating lease token/page owner, two-minute renewable lease, staging-generation-based two-hour hard deadline, fail-closed generic cleanup, explicit expired-lease resume/cancel, re-hash + fresh revision + second confirmation, and same-transaction lease/revision guards. Deterministic regression and real unpacked Chrome 152 run `33825545613` prove old-token rejection, successful resume and explicit cancel without unintended Journal mutation. |

## P2 — product/architecture backlog

P2 items are not silently treated as current release blockers unless another ACTIVE P0/P1 explicitly depends on them.

| Code | Status | Backlog owner |
|---|---|---|
| P2-001 | BACKLOG | Save HTML/Markdown alongside PDF. |
| P2-002 | BACKLOG | Local user-selected WebClip folder via File System Access/native helper. |
| P2-003 | BACKLOG | Integrations such as Yandex Tracker/other systems. |
| P2-004 | BACKLOG | Tags/categories/notes/extended metadata. |
| P2-005 | BACKLOG | Full-text local material search. |
| P2-006 | BACKLOG | Shadow DOM as explicit selection scope. |
| P2-007 | BACKLOG | Multiple explicit capture/output modes: faithful semantic selection, visual Region/Screenshot fallback, Reader PDF / Print PDF / HTML. |
| P2-008 | BACKLOG | Expanded local health telemetry/report for quota/cache/log/DB repair. |
| P2-014 | BACKLOG | Decompose oversized runtime modules by trust/subsystem boundaries; measure cold-start/maintenance impact. |
| P2-015 | BACKLOG | Investigate streaming signed-upload bodies to reduce large Blob peak memory after admission correctness. |
| P2-016 | BACKLOG | Exact extension-page capability matrix / least-privilege permission review. |
| P2-017 | BACKLOG | Optional persistent-credential architecture; session-only access token remains default. |
| P2-018 | BACKLOG | Remove or explicitly harden dormant privileged text-transfer capability. |
| P2-019 | BACKLOG | One authoritative shared IndexedDB schema/migration owner across worker/offscreen/page openers. |

`P2-009` and `P2-010` remain permanently history-reserved even though their detailed historical rows are not repeated here. Historical implemented P2-011/P2-012/P2-013 remain reserved and their implementation evidence remains in Git history.

## Evidence and detail authority

Use these files by role:

- `RESEARCH_REGISTRY.md` — **current code ownership/status only**;
- `RESEARCH_DELTA_INDEX.md` — navigation from root-cause family to consolidated family evidence;
- consolidated `RESEARCH_FAMILY_*_EVIDENCE.md` — detailed current source proof/acceptance/regression schedules until individually consolidated;
- `RESEARCH_EVIDENCE.md` — historical implementation/browser proof;
- `RESEARCH_RETIRED_DELTA_EVIDENCE.md` — losslessly retired correction/positive-control deltas;
- `RESEARCH_CROSSCUTTING_REVALIDATION_EVIDENCE.md` — broad revalidation/implementation taxonomy/positive controls;
- `RESEARCH_HISTORY_INDEX.md` — retractions, dedup decisions and product/security decisions;
- `TEST_STATUS.md` — current test/release truth;
- `TEST_EVIDENCE.md` — historical test/browser checkpoints;
- Git history — exact retired original documents.

## Number allocation protocol

Before assigning any new P-code:

1. semantic-search current `RESEARCH_REGISTRY.md` owner/root cause;
2. inspect relevant family in `RESEARCH_DELTA_INDEX.md` and consolidated family evidence;
3. inspect `RESEARCH_HISTORY_INDEX.md` / retired evidence for rejected/merged hypotheses;
4. search Git history for prior assignment/reservation;
5. only then allocate a demonstrably unused code.

A fresh observation that refines an existing root cause updates that owner; it does not receive a new number merely because the execution schedule is new.

## Test/release boundary

Creating/updating this registry does not execute product tests. Historical latest documented product gate remains 88/88 JavaScript syntax + 74/74 deterministic PASS and is **not** a current-HEAD rerun. Manifest remains `0.9.8`; real unpacked Chrome and real Yandex E2E remain release requirements in `TEST_STATUS.md`.