# Audit history index

This is the compact history needed to prevent repeated audit mistakes after verbose historical audit narratives are retired from the current tree.

It does **not** replace the current P registry. Current status and acceptance criteria live in the canonical priority registry; detailed current source proof may remain in `AUDIT_DELTA_*.md` until individually consolidated. This file has one narrower purpose: preserve rejected hypotheses, duplicate-owner corrections, status-history traps, important negative checks and deliberate product/security decisions that should not be rediscovered as new defects.

## Explicit corrections / retractions

### P0-039 generic `pendingAppends` capacity hypothesis — retracted

A temporary audit refinement claimed that a full generic `pendingAppends` queue could allow the next physical download/upload to complete without durable recovery metadata. Re-check of live callers showed the generic `safeAppendJournalEntry()` pending store is no longer on the current irreversible save path. Current local downloads use specialized `pendingDownloads` before `chrome.downloads.download()`, and Yandex saves use `pendingRemoteSaves` before signed PUT/publication.

Therefore that specific capacity hypothesis was retracted. Do not reopen this exact claim unless a future code change again introduces a live irreversible-save caller of generic `safeAppendJournalEntry()`.

A later and different P0-039 refinement remains valid: unresolved `pendingDownloads` evidence must not be converted from unknown external settlement into permanent metadata loss merely because a TTL expired and Chrome no longer exposes a matching DownloadItem.

### P1-004 / P1-171 exact child-document identity — duplicate owner corrected

The reused-`frameId` / missing exact child `documentId` generation finding was briefly restated under the P1-004 umbrella. The audit explicitly deduplicated it: P1-004 remains the feature-level cross-origin iframe umbrella and P1-171 is the single detailed owner for the child-frame document-generation/navigation fence. No new P-number is allocated for the same root cause.

### Storage quota snapshot overbooking — stays under P1-043

`ensureStorageBudget()` uses a storage-estimate snapshot plus one safety reserve but has no concurrent byte-reservation ledger. Concurrent large writers can each pass against the same free-space snapshot. This was explicitly classified as the same storage-admission root cause as P1-043, refining that owner instead of allocating a new P-code.

### Cross-context readonly publication — stays under P1-086

The original P1-086 service-worker fix waited for readonly IndexedDB transaction completion before publishing results. Later audit found the same early-publication class in offscreen PDF-cache/transfer reads. This was explicitly treated as a refinement of P1-086, not a new P-code. The invariant is cross-context: request success is provisional until `tx.oncomplete`; late abort/error must still reject.

### Shared IndexedDB migration ownership — stays under P2-019

The audit extended P2-019 from the Journal view/worker duplicate schema owner to the PDF retry cache, where worker and offscreen already have different upgrade/migration behavior. This is one shared-schema/migration ownership problem. Do not allocate a new number merely because another shared IndexedDB exhibits the same multiple-authoritative-upgrader root cause.

### Print-time unsafe-URI TOCTOU — stays under P0-071

A later audit showed that one-shot link sanitization before `Page.printToPDF` is insufficient because host `beforeprint` mutation can recontaminate the live print DOM. This broadened P0-071 from pre-print URI sanitization to an enforceable safe-scheme invariant on the actual printed representation; it was intentionally not assigned a new P0.

### Historical virtualized-content mode ambiguity was superseded for current PDF — P1-230 is now independent

The earlier deferred/virtualized materialization tranche intentionally did **not** allocate P1-230. At that time, whether the primary PDF should preserve only the current mounted/rendered window or a wider logical history was still an unresolved P2-007 product/mode question.

That historical classification was correct for the then-current contract. It is not current acceptance truth after `WEBCLIP_PDF_FIDELITY_CONTRACT.md` explicitly required scroll-triggered new logical content already materialized by the user's own scrolling, up to the user's reached boundary, to remain within the PDF completeness envelope. WebClip itself still must not auto-scroll farther merely to create new logical items.

Fresh C22/C23 L3/L4 evidence subsequently proved that a virtualizer can recycle/detach items the user actually traversed, leaving physical PDF with only the current mounted window. This defect persists independently of ordinary clipping, resource readiness and document/application-generation owners. Therefore P1-230 is the independent current owner for generation-bound preservation/reconstruction of user-reached dynamic/virtualized history or truthful partial/degraded/unknown when that history cannot be safely reconstructed.

Do not repeat the old “P2-007 mode ambiguity, therefore no owner” conclusion for the current primary PDF unless the product contract is explicitly changed again.

### Historical hover-mode ambiguity was resolved, but C26 stays under P0-075/P0-070/P0-004 — do not allocate P1-231

The earlier focus/interaction-state tranche proved that Chromium can physically serialize CSS `:hover`, hover-only content and pointer-dependent state, but deliberately left preservation-versus-normalization as a product-mode decision. It assigned the underlying live-control-plane/admission/physical mechanism to P0-075/P0-070/P0-004 with P2-007 supporting.

The later current PDF contract explicitly resolved the product question: hover-only state must be excluded even when user hover existed at admission. Fresh C26 L3/L4 revalidation then showed a precise split:

- current WebClip-shaped full-screen review backdrop clears tested ordinary CSS/pseudo hover and fires pointerleave;
- if the page itself removes hover UI on leave, physical PDF does not contain it;
- but a JS flyout mounted by hover and retained after leave is still consumed as ordinary live DOM and appears in physical PDF, including in a same-origin frame;
- allowed non-hover open dialog remains present, so blanket transient-state deletion is not an acceptable replacement.

This is a current-contract **FINDING**, but not a new independent root cause. The failure is exactly the already-owned absence of a trusted/inert admitted representation before host-page interaction and physical generation. P0-075 is the primary isolation/control-plane owner; P0-070 owns deterministic admitted generation; P0-004 owns physical selected-copy consequences. P2-007 is no longer needed to decide current-PDF hover semantics.

Therefore **P1-231 remains unallocated**. Do not create a dedicated hover owner for this same mechanism unless future implementation introduces a materially independent hover-normalization subsystem/root cause.

### Historical disclosure support is not current C24 inert-contract PASS — keep under existing owners

Historical source and browser evidence showed that WebClip could reveal native `<details>` and page-style disclosure content for printing. That evidence must not be promoted to a current C24 PASS after `WEBCLIP_PDF_FIDELITY_CONTRACT.md` made the acceptance rule explicit: source-closed safe content may be statically expanded for later reading only through inert representation, without page-owned activation or silent admission of stateful interaction-created content.

Fresh C24 L3/L4 revalidation on canonical `main = 0ecfff217d8cc81099fadd9476532d8d7d845f28` establishes the precise split:

- native closed and nested `<details>` can become physically readable, already-open details stays open, and an explicitly Excluded descendant remains absent — positive controls;
- current preparation sets `details.open = true` on the live page, so a page-owned `toggle` handler can create new DOM that then appears in the physical PDF;
- current ARIA/accordion fallback performs page-owned `.click()`; disclosure-like `button[type=submit]` and non-hash anchor controls can pass the heuristic, and a tested semantic submit produced a real submit event;
- stateful DOM created only because of WebClip's synthetic click appeared in the physical PDF;
- disclosure mutations are intentionally not rolled back after print, and no `sourceState=closed` versus `staticRepresentation=expanded` provenance receipt is emitted;
- selected same-origin child details receives top-helper expansion, while current cross-origin `frame-agent.js` has no disclosure-expansion step;
- serial per-control waits and broad disclosure scans remain outside one shared preparation budget.

This is **C24 `ARTIFACT-COVERED / FINDING`**, but it does not establish an independent new root cause. Synthetic activation is already owned by **P0-067/P1-212**; shared preparation work by **P1-167**; live-hostile-page/static-generation/physical consequences by **P0-075/P0-070/P0-004**; **P1-004** remains the supporting cross-origin feature umbrella. Historical PR #29 had already classified disclosure `.click()`/budget evidence under these owners without a new P-code.

Therefore do **not** allocate P1-231 merely because C24 now has current-contract physical evidence. A future new owner requires a materially independent root cause, not another disclosure fixture or frame variant of these same mechanisms. Durable evidence: `AUDIT_INERT_DISCLOSURE_CONTRACT_2026-08-30_EVIDENCE.md` and `project_tools/audit_inert_disclosure_contract.py`.

### Renderer-level SelectionSnapshot restore success is not final-artifact success — C02 stays under P1-001/P0-080 and existing physical owners

Earlier SelectionSnapshot evidence proved locator confidence, remote toggle/session and bounded-candidate defects at the restore/renderer boundary. Do not promote those renderer-level successful counters to final saved-artifact truth.

Fresh C02 L3/L4 revalidation on canonical `main = 07df33f5d1ed572bd4da3083411aef9dd94d21c0` drives the actual current `content.js` restore and selected-only preparation into physical Chromium PDF. It establishes the precise split:

- stable visible Include after benign insertion reaches the intended physical PDF, restored Exclude stays absent, equal plausible candidates can fail closed, and same-origin framePath restore reaches physical output — positive controls;
- a target with non-zero geometry but `visibility:hidden` can receive high-confidence successful restore while the intended text is absent from the physical PDF;
- a target with non-zero geometry but `opacity:0` has the same false-success/final-artifact gap;
- the fixed first-5000 tag candidate prefix can omit the known exact target, admit an in-prefix decoy with high confidence and physically serialize the decoy instead of the intended target;
- after successful restore, same-document page replacement can disconnect the selected Element while `state.includes` still keeps a non-zero Include count; save admission proceeds but the physical selected artifact contains no intended live selected content.

These are **C02 `ARTIFACT-COVERED / FINDING`**, but they do not establish a new independent root cause. Hidden/transparent and bounded-candidate confidence remain **P1-001**; disconnected/replaced same-document selection remains **P0-080**; exact-generation/live-hostile-page/physical consequences remain **P0-070/P0-075/P0-004**; **P1-200/P1-171** remain supporting remote/session/frame owners from earlier restore evidence.

Do not allocate another late P1 solely because these already-owned restore/generation defects now have B6 physical proof. A future separate owner requires a materially independent restore-to-artifact mechanism after candidate admission and exact-generation fencing are implemented. Durable evidence: `AUDIT_SELECTION_RESTORE_PHYSICAL_PDF_2026-08-31_EVIDENCE.md` and `project_tools/audit_selection_restore_physical_pdf.py`.

### Main Content confidence/fallback is P1-160, while P1-228 remains manual hit-test/geometry — C03 duplicate boundary

Fresh C03 L3/L4 revalidation on canonical `main = 869c47b14254fdadded1e24dc6a6bfabafc049a1` closes Main Content automatic candidate admission through physical PDF and clarifies an important owner boundary.

Current source and physical controls establish:

- a strong visible semantic article beats unrelated navigation/footer shell and reaches physical PDF — positive control;
- a hidden semantic competitor is rejected — positive control;
- an accessible same-origin frame article can become the physical selected scope — positive control;
- `bestScore < 900` only triggers a second fallback pass; after that pass there is no final confidence floor, so a weak BODY remains non-null and can be selected instead of reaching the existing “choose manually” fallback UX;
- a supporting exact-formula model measured the retained weak BODY fixture at score 185, and physical PDF contains the navigation/footer shell;
- two equally scored strong articles have no second-best/margin/ambiguity state; strict `score > bestScore` promotes DOM/Set iteration order into saved-scope authority, and physical PDF contains only the first tied candidate;
- post-auto replacement/disconnection keeps stale internal Include authority and can yield an artifact with no intended selected content;
- in-place mutation of the selected Element can change the logical content serialized under the old automatic decision;
- candidate discovery/scoring performs broad whole-document scans and repeated descendant/body-text work without one shared node/candidate/time envelope.

The low-confidence and tied-winner findings are already exactly within **P1-160**, whose canonical wording requires bounded auto-content discovery and graceful manual fallback. Do **not** move them to **P1-228**: that owner is specifically manual event-target / hit-test / rendered-geometry authority. Post-admission replacement/drift remains **P0-080/P0-070/P0-075**, with **P0-004** for physical consequence.

Therefore no new “auto-content confidence” P-code is allocated. A separate owner would require a materially independent confidence subsystem after P1-160’s discovery/fallback contract is implemented. Durable evidence: `AUDIT_MAIN_CONTENT_PHYSICAL_PDF_2026-08-31_EVIDENCE.md` and `project_tools/audit_main_content_physical_pdf.py`.

## Status-history traps

### Historical closure PASS does not override later reopen

P1-009, P1-090 and P1-125 each had an older implementation checkpoint whose closure document said REGRESSION/PASS for the scope implemented at that time. Later deep audit reopened them as PARTIAL for, respectively, Journal search CPU/deadline scalability, post-move exact Yandex object identity, and same-URL/document-generation settlement identity.

The old implementation evidence remains useful in `AUDIT_EVIDENCE.md`, but current registry status always wins. A historical PASS must never be promoted to current closure merely because its original closure file existed.

### P1-156 versus P1-169 are distinct lifecycle layers

P1-156 owns active prepared Save As lifetime/reconciliation: owner-page loss before STARTED/RELEASE, missed terminal download events, RELEASE control settlement and backing Blob lifetime while a native Save As dialog is legitimately open. P1-169 separately owns GC of already-released session tombstones. Do not merge one into the other or create a third owner from the same two states.

### P1-157 versus P1-193 permission semantics are distinct

P1-157 covers the actual `chrome.permissions.request()` once admitted: the browser prompt is user-owned/non-cancellable and a caller timeout is not cancellation, so retry must not stack a second prompt over unknown settlement. P1-193 covers admission before the prompt: long asynchronous frame discovery can consume transient user activation, so the permission request may never be legally started. These are different boundaries.

## Rejected / non-new hypotheses

### Yandex path traversal through `joinDiskPath()` filename components — not reproduced

The suspected `..` escape did not reproduce in the reviewed path because `sanitizeDiskName()` strips trailing dots/spaces and dot-only segments collapse to `_`; destructive Yandex moves also revalidate managed-branch containment. Existing P0-040/P1-090 controls were considered effective for that reviewed path.

This is not a blanket proof that every future path-building call is safe; it means this exact already-reviewed hypothesis must not be reintroduced without a new source path/repro.

### Journal / Options DOM-XSS hypothesis — no new sink found in the reviewed pass

Dynamic Journal content was built through DOM nodes/`textContent`; reviewed Options `innerHTML` usage was static extension-owned markup and external errors were inserted as text. No new Journal/Options DOM-XSS P-item was allocated in that pass.

### `prepared-save-as.js` generic lifecycle finding — already owned

The reviewed path produced no independent generic owner beyond existing Save As lifecycle/RPC items. Later exact receipt/terminal-file findings remain independent, but the original page-owned `saveAs:true` observation is not a new defect by itself.

### Dormant `text-payload-upload` weakness was not a live P0-063 regression

Audit found a chars-versus-UTF-8-byte reservation weakness in dormant offscreen `text-payload-upload`, but no live service-worker product caller was found. Live product paths used PDF-cache upload, byte-checked chunk upload and text download. The dead/residual branch was therefore not used as evidence to change P0-063 by itself; its removal/hardening belongs to the dormant-capability cleanup owner.

### Ordinary Yandex Disconnect is not server-side revoke

For ordinary non-device Yandex tokens, the reviewed product `Отключить` action deletes WebClip's local session token. The audit explicitly did not classify the lack of automatic server-side token revocation as a security defect by itself. If device-specific/persistent credentials are adopted later, revocation semantics can be reconsidered under the credential-architecture owner.

## Deliberate product/security decisions preserved from history

### Public links enabled by default is intentional

`createPublicLinks` ON-by-default was explicitly treated as a product decision, not an audit defect. P1-164 owns per-entry revocation; P0-078 separately owns revocation of authorization for not-yet-settled publication after the global policy is switched off.

### Session-only OAuth access token is intentional baseline

The historical security decision kept the Yandex access token in `chrome.storage.session`, with PKCE S256 and no persisted refresh token as the default browser-only posture. Alternative persistence designs were evaluated as product/security trade-offs, not silently adopted requirements. Documentation that a refresh grant may not always require a client secret is only an E2E hypothesis until verified against the real WebClip/Yandex public-client configuration.

### Enterprise browser policy was not bypassed

The audit environment's managed Chromium blocked normal unpacked-extension loading. The project intentionally did not bypass the policy and did not count blocked full-unpacked runs as PASS. Managed browser evidence is regression evidence; real unpacked Chrome remains release QA.

### OperationLog diagnostic payloads are intentional product functionality

Historical deep audit explicitly retained bounded permanent diagnostic fields such as page/print/frame/root-layout analysis. Their existence alone is not dead-code/privacy evidence; confidentiality/redaction and retention rules still apply to their contents.

## Historical positive controls worth retaining

At the reviewed historical checkpoints:

- no remotely hosted/executed extension code or eval-like execution was found;
- cross-origin site access remained optional host permission rather than install-time all-sites permission;
- Yandex tokens were sent in Authorization headers rather than query strings;
- reviewed network fetch paths were HTTPS/AbortController bounded and signed offscreen transfers rejected redirects to non-approved signed hosts;
- no new direct token-exfiltration, arbitrary remote-code execution, content-script-to-admin bypass or incognito-journal boundary bypass was found in the cited passes;
- Settings export remained allowlisted and excluded OAuth secrets, PKCE pending state, Journal/checkpoint data and OperationLog contents;
- progress-port Sets removed dead ports on disconnect/post failure and Journal page timers were cleared on `pagehide` in the reviewed state;
- Journal session contexts had TTL/count/batched-removal bounds and reviewed Yandex directory/locate/verify loops had explicit bounds/deadlines;
- background Journal backup remained explicit opt-in and required a selected Yandex root;
- external Yandex JSON bodies were bounded before parsing in the reviewed paths;
- Journal metadata rendering used text nodes rather than HTML injection.

These are historical positive controls, not perpetual guarantees. Re-audit them after relevant runtime/security-boundary changes.

## Deep-audit assignment retirement map

The verbose `DEEP_AUDIT_2026-08-25.md` introduced/refined the active owners that were subsequently copied into `PRIORITIES_P0_P1_P2.md`, including the P0-063…P0-078 audit layer, P1-154…P1-194, P2-014…P2-019 and refinements of earlier owners such as P0-022/P0-023/P0-039/P0-048/P0-071/P1-004/P1-009/P1-043/P1-086/P1-090/P1-125/P1-156/P1-157/P1-158/P1-168/P1-178/P1-182/P1-184.

The retirement comparison on 2026-08-29 re-read the full deep-audit narrative against the current priority registry. Active finding text/acceptance criteria are already represented by that registry; historical implementation/browser PASS data lives in `AUDIT_EVIDENCE.md`/`TEST_EVIDENCE.md`; the explicit corrections, deduplications, rejected hypotheses and product decisions that are unsafe to lose are retained above.

Therefore `DEEP_AUDIT_2026-08-25.md` is a historical source artifact rather than current working truth and may be removed from the `main` tree after this index is committed. Its exact original content remains recoverable from Git history.

## Historical test-gate interpretation

The deep audit began from an older 84/84 syntax + 71/71 deterministic baseline. Later product work reached a documented **88/88 syntax + 74/74 deterministic** gate. Subsequent audit/consolidation work was docs-only with respect to production runtime, but those suites were not rerun merely because documentation changed.

Current compact truth is in `TEST_STATUS.md`; detailed historical checkpoints are in `TEST_EVIDENCE.md`.