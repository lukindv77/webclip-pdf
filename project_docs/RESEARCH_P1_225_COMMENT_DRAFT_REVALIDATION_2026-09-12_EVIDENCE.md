# P1-225 — comment draft ownership across save, editor replacement and reload

Date: 2026-09-12. Owner: **P1-225, ACTIVE**. Research only.
Canonical baseline: `ecfe0ea683983a4b2a2b953fca9a7b66dd33ece9`.

## Baseline and scope

Fresh main, Registry, context manifest, open PRs/issues, relevant branch and tracked tree were inspected. No open PR/issue required continuation; no tracked AGENTS.md was present. Current requirements, rationale, architecture and Journal comments family were reread. Research/workflow/session/navigation/coverage policy blobs match already-read current context. This is a bounded local-draft and mutation-completion refinement; it does not claim whole Journal correctness or project-wide research completion.

Historical branch `research/p1-225-comment-draft-save-2026-09-08`, exact head `f563ec44d2dd0669c8d29bfc621dd863e0719ac4`, is provenance only: 3 ahead / 59 behind this main, merge base `d4f5b268fa3f7ced5a7bc68da52784863d614138`. Its three files/commits are not imported. Current family evidence already owns the Save A / newer unsent B loss and separates P0-076 authoritative mutation CAS. No new P-code is justified.

The selected workspace remained unavailable after an execution-server handshake failure. The available built-in JavaScript runtime compiled/executed the new model and complete CommonJS entrypoint with explicit in-memory fs/path adapters supplying exact fetched journal.js and Registry strings. No local Node command, filesystem checkout, browser input or IndexedDB execution is claimed. Mandatory Repository Integrity supplies the independent Node/syntax delivery check.

This tranche covers current-source editor behavior, list replacement, response ownership and a proposed bounded state model. It contributes to local UI/convergence evidence and external comparison (C37/C46 relationship), without changing Coverage Matrix status. Browser input/message order, actual storage CAS and accessibility remain implementation gates. Two files plus exact-head and post-merge CI form the delivery envelope.

## Requirements, ownership and current source

The P1-225 Registry/family contract explicitly permits either freezing the submitted draft or preserving newer edits with revision ownership. Underlying mutation authority remains P0-076; retaining unsent text never grants permission to overwrite a replacement entry/comment or resurrect a deleted comment. P1-202/P1-211 retain deletion/tombstone semantics. P1-222's Options draft flow is a separate owner.

Current `journal.js` Git blob: `1138e4fbf177e31008f510bc1addfd539885f10e`.
Current `service-worker.js` Git blob: `6d61ac81befdbf2804ae9dbec425aa08d1194eb1`.

| Source location | Existing positive control | Missing boundary |
|---|---|---|
| journal.js:1921–2089, buildJournalComments | Supports Add/Edit, validates blank input, captures submitted text, disables that Save/Cancel pair, displays text through textContent. | Draft text resides only in the textarea; mode/comment ID reside in a disposable card closure. |
| journal.js:1974–1978 | Edit targets the selected exact comment ID. | Other Edit buttons remain enabled while a Save is pending; they call render and create another editor. |
| journal.js:2055–2079 | Ordinary caught error leaves the existing textarea and re-enables controls. | Successful response clears shared editor mode and rerenders unconditionally; no editor-session/draft revision check. |
| journal.js:629–643, 1489–1526, 1827–1830 | Runtime/revision notifications coalesce reload; loadJournal has a load-generation guard. | An accepted reload still replaces entry cards. Load generation protects view request order, not unsent draft lifetime. |
| worker:6117–6159 | Add/Edit validate text/target, perform the update, notify change and return the updated entry. | Add returns an entry containing a generated comment ID, not an explicit request-correlated created-comment receipt; UI recovery must not guess identity. |
| worker:4240 onward | Runtime notification and durable revision write are coalesced independently. | Their relative delivery versus the direct save response is not established by source inspection alone. |

Both raw textarea value and outbound payload are concrete strings. Successful storage of submitted A can coexist with unsaved local B; neither success nor a reload gives A authority over B. Current worker storage implementation is inspected for response shape, not verified as concurrency-safe in this tranche.

## Six executed current gaps and two controls

The companion executes actual normalizeEntryJournalComments/buildJournalComments and renderEntries source with a minimal DOM/button double and controllable Promise responses. It invokes real source handlers and waits for each selected completion. buildEntryCard is deliberately reduced to the comment section; full Journal rendering, timers, Chrome messaging and IndexedDB are not emulated.

1. Add A, type B while pending, return A success: textarea disappears; only A is in the displayed entry.
2. Edit follows the same loss schedule while retaining the submitted comment ID in the request.
3. Save c1 remains pending; enabled Edit c2 opens a new editor and B is typed there. c1 success clears the shared editor mode and removes the c2 draft.
4. Reopening an editor creates another enabled Save button while the first request is pending. Two requests can therefore be admitted despite the first button being disabled. Resolving B then A repaints the local entry with the old A response.
5. Executing current renderEntries while Save is pending removes the submitted textarea. A later rejection operates on detached controls and cannot restore the visible draft.
6. After card replacement and a new editor opens, an old failed request leaves the new text intact but overwrites global status with its obsolete error.

Positive controls: ordinary rejection preserves newer B when the original editor is still mounted; blank input emits no mutation and focuses the textarea. These distinguish the actual gap from a claim that all failure paths lose text.

The list replacement test directly invokes the extracted renderEntries function. Source inspection connects notifications/reload to rendering, but the full notification scheduler is not executed. The out-of-order response test proves stale **local repaint**, not actual IndexedDB commit order or measured production incidence.

## Fresh external evidence

Retrieved 2026-09-12; all external observations are comparison inputs.

| Primary source | Observation | Application / limit |
|---|---|---|
| [React: preserving and resetting state](https://react.dev/learn/preserving-and-resetting-state) | Removed UI subtrees lose local state; the documented chat example retains drafts in parent state keyed by recipient. | Supports keeping comment drafts outside replaceable card DOM. This is an architectural analogy; WebClip need not adopt React. |
| [React useEffect](https://react.dev/reference/react/useEffect) | The data-fetch example ignores responses after its owning effect is invalidated because responses can arrive out of order. | UI completion needs lifetime ownership. Unlike a read, a submitted mutation may already have committed and must still be reconciled. |
| [TanStack Query mutations](https://tanstack.com/query/latest/docs/framework/react/guides/mutations) | Consecutive mutations can finish out of order; per-call callbacks depend on the current observer/mount, while mutation-level handlers differ. | Separate durable mutation settlement from observer-specific UI work. A library's latest callback policy is not a complete draft/storage contract. |
| [MDN readonly](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Attributes/readonly) | Readonly controls prevent user editing while remaining focusable; disabled controls differ in focus/form behavior. | Readonly is a plausible pending-edit UX, but it does not preserve state when the DOM node is removed. |

The fresh search for public mutation-callback discussions returned generic/unrelated destinations, which are excluded. No new validated user-complaint frequency, prevalence estimate or usage trend is claimed. The concrete user scenario is editing a comment while a slow save or background Journal update completes, without losing the latest text or being told that unsent text was saved.

## Refinement: freeze alone is not an editor lifetime protocol

Freezing the submitted textarea before the first await closes the simple “type B into this field” path. It does not prevent a different Edit button from rendering another editor, or a page-level reload from replacing the frozen node. The historical freeze recommendation therefore needs explicit lifetime handling: block conflicting editor replacement, defer destructive rerender, or retain submitted text and pending operation outside DOM so it can be remounted.

A freeze implementation must recover A after a definitive rejection even if a notification already replaced the card. A missing response must retain an unresolved operation rather than pretending nothing was committed. Current ordinary error retention is a positive control to preserve, not a complete remount solution.

Generation-aware editing allows continued typing but requires both a stable draft store and exact editor/session ownership. Merely comparing input.value at success is insufficient when that input is detached or another editor shares the enclosing mode variables. Merely storing text without the pending operation can recreate an enabled Add button and duplicate the request.

## Proposed bounded draft and operation state

Store drafts outside disposable card closures, keyed by exact Journal/entry generation and comment identity or a unique add-draft identity. Store text, local edit revision, editor session, pending operation reference and recovery/identity state. Use exact generation identities, not just reusable textual entry/comment IDs.

Save creates an immutable receipt containing operation identity, target identity/generation, Add/Edit kind, submitted text and submitted revision. A newer text edit increments revision even if it later returns to identical text. A success may close only the submitted draft whose session/revision/text still match; it must never close the currently visible editor simply because some request succeeded.

| Event | Required effect |
|---|---|
| Confirmed save A, unchanged submitted draft | Close that editor and display committed A. |
| Confirmed save A, newer draft B | Preserve B as unsaved; record that A was committed. |
| Another editor is active | Settle A separately; do not close, focus or replace the other editor's status. |
| Reload/remount | Reconstruct draft and pending state from stable state, not persisted comment text alone. |
| Definitive rejection | Preserve latest draft and permit a later explicit retry after appropriate target validation. |
| Uncertain response/transport loss | Retain submitted receipt and draft; prevent blind repeated Add. |
| Duplicate/late callback | No new UI teardown or clearing of a newer pending request. |
| Entry generation replaced/comment invalidated | Preserve recoverable text while blocking automatic retarget/resurrection. |

The model serializes local mutations per admitted entry epoch even across editor instances. This is a conservative proposal, not a substitute for worker-side P0-076 transactions/CAS across tabs. Other entries may remain interactive. Production must scope button/error/focus updates to the current editor and operation, not just the last Promise to finish.

Runtime/revision notifications should invalidate or merge committed views while keeping drafts independent. Suppressing a self-notification is optional optimization only: another tab, import or unrelated mutation can still cause reload. Notification ordering is not a dependable save acknowledgment. The model coalesces a synthetic revision high-water mark only to demonstrate draft independence; actual revision-token validation and view sequencing remain separate contracts.

## Add identity and explicit continuation

In Add mode, A success creates a new comment while B may remain in the same editor. If the chosen UX treats B as a continuation of that comment, the next explicit Save should Edit the **exact created comment**, not issue another Add. This continuation policy is a recommendation tested by the model, not a newly adopted product decision. An intentional “new separate comment” workflow must be explicit and must not be selected accidentally by lost mode state.

Current Add returns an updated entry with generated IDs but no dedicated operation-correlated created ID. A production change should return a validated created-comment identity and committed revision bound to the admitted request, composing with P0-076. Comparing text, selecting the newest timestamp or choosing the last array element cannot prove identity under concurrent updates. If exact correlation is unavailable or inconsistent, preserve B and the receipt, expose unresolved identity and block automatic mutation until reconciliation. The model treats that mapping as a supplied verified input; it does not invent a worker guarantee.

Unknown response is different from definitive rejection: the write may have succeeded before the response was lost. Discarding an old UI callback must not discard that mutation fact. Retain/reconcile the operation, and never retry non-idempotent Add solely because its card unmounted. Backend idempotency/CAS and durable recovery are dependencies, not implemented here.

## Boundedness, privacy and implementation trade-offs

A small per-page draft store avoids keeping every hidden card alive. Bound draft count, individual text and aggregate text/receipt bytes; reclaim only resolved or explicitly discarded drafts. Capacity exhaustion must be visible and must not evict unsent text silently. The toy model rejects new draft/oversized edits at its limits; it does not implement production eviction, text normalization or the full server quota policy.

Memory-only retention covers card rerenders within the same page lifetime. It does not survive closing the tab, extension restart or device failure. Persisting drafts would require an explicit retention/privacy decision: comment text may be sensitive, and must not be added to logs, synchronization, export or third-party services merely to solve a UI lifetime bug. This tranche introduces no storage location, network dependency or permission.

Freeze has simpler editing semantics but blocks typing during a slow operation; preserving edits is more responsive but needs revision, identity and pending-state management. Either must address remount and switching. Readonly, disabled, keyboard/IME, focus restoration and screen-reader feedback require real-browser verification; the model has no IME/composition or actual accessibility tree.

Implementation sequence: choose the allowed pending-edit UX; introduce bounded stable draft/operation state; guard save and editor-switch admission; merge reloads without destroying drafts; fence completion/status/focus by exact owner; add correlated Add identity and authoritative mutation integration; then verify browser and storage boundaries. A framework or query library is not required for these small state transitions.

## Validation, residual scope and delivery

The exact candidate file compiled/executed in built-in JavaScript and its CommonJS entrypoint ran with documented adapters: **24 named checks PASS** — six executed current gaps, two current controls and sixteen target-state checks. Target cases cover unchanged/newer drafts, revision changes with equal text, both notification orders, remount, another active editor, explicit retry versus unknown outcome, duplicate callback, replacement epoch, identity mismatch, Add-to-Edit continuation, freeze parity and bounded admission.

Source extraction anchors intentionally fail after relevant runtime shape changes. The DOM double models only the controls and replacement relationships needed by these schedules. It is not full journal.html, real focus/IME, Chrome messaging, IndexedDB, a multi-tab CAS proof or browser PASS. Storage response identity, actual notification order, reload after pending failure and tombstone/replacement handling need direct integration evidence.

P1-225 remains **ACTIVE**. This research does not change the accepted choice between freeze and editable preservation, and does not close P0-076 or related Journal owners.

Exactly two files: this evidence and `project_tools/test_p1_225_comment_draft_revalidation_model.js`.
Delivery: fresh-main branch -> research-impact: owner PR -> exact-head Repository Integrity -> fresh main/head/mergeability/two-file guard -> expected-head squash -> exact merge-SHA push CI. PR/run records supply final delivery identities; no future CI result is preclaimed here.

Runtime, Registry, manifest and version remain unchanged.
Hard fence: `EXPLICIT_USER_APPROVAL_FOR_RELEASE_POLICY_ACTIVATION`.
P1-231 S2 authorized=false; release authorized=false; product ZIP=false. Existing S0-F portability blocker, release policy/readiness/receipts, tags, GitHub Releases and deploy/publish remain untouched.
