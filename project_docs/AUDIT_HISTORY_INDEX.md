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