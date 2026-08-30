# Durable audit evidence — selection save freeze / host reentrancy / pre-IPC locator admission — 2026-08-30

Canonical status and single-owner authority remain exclusively in `AUDIT_REGISTRY.md`. This document preserves a 50-block source-first deep-audit tranche focused on the boundary between user-reviewed selection, mutable local/remote selection state, page-reentrant DOM marker mutations and locator materialization before extension message admission.

Audited fresh source baseline: `main` at `239a6b1f2b2b613e959796f5f2a5762321b6fbb0`.

Managed Chromium: `144.0.7559.96` on Debian 13. Browser probes use ordinary DOM plus CDP-created isolated worlds; they are engineering evidence and do not replace real unpacked-extension release QA. The managed browser's enterprise policy was not bypassed.

## Executive classification

No new permanent P-number and no canonical status transition are justified by this tranche.

- **P0-070 ACTIVE — save-authority refinement.** User-reviewed selection must become one exact frozen local+remote selection receipt before metadata and physical print preparation diverge. Current top UI can enter `review`/`printing` while a permitted cross-origin frame-agent remains `selecting`; `buildSaveMeta()` freezes one cached remote snapshot before the child is actually frozen by `prepare-print`. Remote state may therefore change after review or after metadata capture and drive a different print scope.
- **P1-200 ACTIVE — remote selection-session refinement.** Review/freeze is part of the selection-session protocol, not only `start`/`clear`/`set-mode`/`restore`. State events and local child mutations need exact session/freeze generation so no post-review or post-snapshot mutation can become current save authority.
- **P1-214 ACTIVE — multi-frame preparation refinement.** Sequential remote prepare fan-out must consume exact frozen per-frame selection receipts; later frames cannot remain mutable while earlier frames prepare and then be admitted from a newer selection state.
- **P0-075 ACTIVE — host-control-plane refinement.** Page-owned marker attributes are not merely forgeable after the fact. WebClip's own `setAttribute()`/`removeAttribute()` calls on page DOM can synchronously execute page custom-element lifecycle code and page CSS before the extension-side Map mutation commits. A hostile or simply reactive page can therefore re-enter selection logic or invalidate the selected node during the mutation itself.
- **P0-080 ACTIVE — live-selection refinement.** Final save/freeze authority must validate live local and remote selected DOM, not only Map membership or a child `get-state` snapshot built from stale Map references. Same-document child SPA replacement is distinct from browser `documentId` replacement.
- **P1-228 ACTIVE — rendered-admission refinement.** A candidate admitted before a page-visible selection marker is written may become hidden, boxless, replaced or disconnected synchronously because that marker participates in page CSS/custom-element behavior. Post-mutation rendered admission or a non-page-reactive representation is required.
- **P1-168 ACTIVE / P1-172 ACTIVE — pre-IPC locator/string admission refinement.** Top SelectionSnapshot locator creation leaves page-controlled `id`, class tokens, `tag` and `cssPath` effectively unbounded before Chrome message serialization. Frame-agent bounds several scalar fields but still builds an unbounded `cssPath`/`tag` before child→worker messaging. The worker sanitizer is an important second boundary, but it executes only after sender-side allocation/selector parsing/message serialization has already occurred.

The current registry wording already owns all of these roots. In particular, P0-075 explicitly says the host page is not a trusted selection/control plane, P0-070 owns exact save generation, P0-080 owns same-document/live selected DOM, P1-168 owns early bounds for page-controlled locator/selector inputs, and P1-172 owns bounds before extension IPC. Therefore this tranche deliberately does **not** allocate P1-229.

No runtime source, `manifest.json`, version, build, tag or GitHub Release is changed by this evidence.

## Source boundary

Fresh `content.js` establishes these relevant facts:

1. `finish`, `download` and `yandex` entry paths set only the top content-script `state.phase = 'review'`; they do not send a remote-frame review/freeze command.
2. `onPageClick()` blocks top-document selection while top phase is `review` or `printing`.
3. `buildSaveMeta()` serializes `selectionSnapshot` from current local Maps plus cached `remote.snapshot` values.
4. `downloadPdf()` and Yandex send build `meta` **before** changing the top phase to `printing` and before `prepareForPrint()`.
5. `prepareForPrint()` calls `syncRemoteFrameAgents()` without a state/freeze command, performs local preparation, and only later calls `prepareRemoteFramesForPrint()`.
6. `commandMappedRemoteFrames()` iterates mapped frames sequentially and `onlySelected` consults the current cached `remote.snapshot` at command time.
7. `handleRemoteFrameEvent()` accepts a valid `state` event and replaces `remote.snapshot` without checking top `review`/`printing` phase or a save-freeze generation.
8. top `addInclude()` / `addExclude()` write page-visible marker attributes before inserting the element into their authoritative Maps; removal paths remove marker attributes before deleting Map authority.
9. top locator creation bounds some text/href/src fields but does not character-bound `id`, individual class tokens, `tag`, or the generated structural `cssPath` before snapshot construction.

Fresh `frame-agent.js` establishes:

1. `start()` sets `state.phase='selecting'`; there is no `review` or `freeze-selection` command.
2. child click mutation continues whenever child phase remains `selecting` and does not require a worker command for each click.
3. `preparePrint()` is the first current save-path command that changes child phase to `printing`; it does so before awaiting resource prefetch.
4. child `snapshot()` maps every value in its Include/Exclude Maps without checking `isConnected`.
5. child locator bounds `id` and individual class tokens but `cssPath()` still embeds the complete page-controlled id and `tag` is not character-bounded before `WEBCLIP_FRAME_AGENT_STATE` messaging.

Fresh `service-worker.js` is a positive second boundary: `sanitizeSelectionSnapshot()` limits `cssPath` to 4000 chars, `id` to 512, framePath to 16 items, list count to 250 and total snapshot size to the configured envelope. This does not retroactively bound sender-side locator construction or Chrome message serialization.

## Blocks 1–16 — review/confirmation is not a frozen remote selection generation

### Block 1 — top `finish` transitions only top state — P0-070/P1-200

`finish` validates `totalIncludeCount()`, sets top `state.phase='review'`, clears hover and opens the save dialog. No child command accompanies that transition.

The user's semantic action “selection is finished; review save options” therefore does not establish a corresponding remote selection state.

### Block 2 — top-document click mutation is blocked during review — positive control

Current `onPageClick()` explicitly suppresses page clicks and returns while top phase is `review` or `printing`.

This is useful local behavior and proves the new issue is not “all selection remains editable after Finish”. The asymmetry is remote-frame lifecycle.

### Block 3 — frame-agent has no review/freeze command — P1-200

The child command switch supports `start`, `set-mode`, `clear`, `stop`, `get-state`, `restore`, `prepare-print` and `restore-print`. There is no command whose postcondition is “selection is frozen for the reviewed save generation”.

### Block 4 — child remains `selecting` until `prepare-print` actually arrives — P1-200

`frame-agent.start()` sets `phase='selecting'`; only `preparePrint()` moves it to `printing`. Opening top review does not change this phase.

Child click handling therefore remains able to mutate Include/Exclude Maps during the top review interval.

### Block 5 — child selection mutation is local and does not need a worker command — P1-200/P0-075

The already-injected frame-agent handles capture clicks locally and then emits `WEBCLIP_FRAME_AGENT_STATE`. A page synthetic click is already within the existing P0-075 synthetic-event threat model; no new privileged top command is needed to change child selection.

The new point is temporal: this existing capability remains live after the user has moved the top UI to review.

### Block 6 — remote state events are accepted in top `review`/`printing` — P0-070/P1-200

`handleRemoteFrameEvent()` replaces `remote.snapshot` on every accepted `state` event and calls `updateCount()`. It has no `state.phase` check for review/printing and no save-generation token.

A child mutation after review can therefore become current cached selection authority.

### Block 7 — mutation during review before Proceed changes the save scope without re-review — P0-070

Deterministic state schedule:

1. user reviews remote selection `{A}`;
2. top phase becomes `review`;
3. child remains `selecting` and changes to `{A,B}`;
4. state event reaches top;
5. user presses Proceed;
6. `buildSaveMeta()` serializes `{A,B}`.

The final metadata may be internally consistent with the child, but B was not part of the selection at the semantic Finish boundary. Save authority drifted after review without a fresh confirmation.

### Block 8 — `buildSaveMeta()` freezes cached remote state before top `printing` — P0-070

Both download and Yandex paths construct `meta` before assigning top `state.phase='printing'`. The snapshot is therefore a point-in-time copy of cached remote state, not a receipt returned by a remote freeze operation.

### Block 9 — `syncRemoteFrameAgents()` in print preparation is not a freshness barrier — P0-070/P1-200

`prepareForPrint()` calls `syncRemoteFrameAgents()` with the default empty command. That operation refreshes mapping/list identity but does not call child `get-state`, does not freeze selection and does not return an exact per-frame selection receipt.

Replacing it with a plain `get-state` alone would still be insufficient for Blocks 43–47 because child Maps may contain stale disconnected nodes; the required boundary is a live validated freeze receipt.

### Block 10 — child freeze begins only when its `prepare-print` handler executes — positive control / boundary

`preparePrint()` starts with `state.phase='printing'` before awaiting `prefetchSelected()`. Once that handler has actually started, later child click mutation is blocked by the phase check.

This is the right direction, but it happens after metadata has already been frozen and potentially after other frames have waited in the sequential fan-out.

### Block 11 — remove-after-meta can make metadata claim a frame that prepare skips — P0-070/P1-200

Deterministic schedule:

1. metadata freezes remote `{A}`;
2. child removes A and emits empty state;
3. top accepts the state before remote prepare;
4. `commandMappedRemoteFrames(..., {onlySelected:true})` sees current cached count 0 and skips that child;
5. metadata/Journal still contains A.

The saved operation now has no single selection generation shared by metadata and prepared print representation.

### Block 12 — add-after-meta can prepare/print child content absent from metadata — P0-070/P0-075

With at least one local Include keeping the save operation admitted:

1. metadata freezes remote `{}`;
2. child adds remote B while still `selecting` and state event reaches top;
3. `onlySelected` now sees B and sends `prepare-print`;
4. frame-chain/selection-document logic also consults current cached remote state;
5. physical PDF scope can include B while `meta.selectionSnapshot` does not.

This is the inverse of Block 11.

### Block 13 — cached-state updates after metadata are not rejected as stale — P1-200

There is no saved selection-generation value attached to `remote.snapshot`. A legitimate current-document state event cannot be distinguished as “newer than the user's frozen save decision” because that freeze generation does not exist.

### Block 14 — sequential multi-frame prepare creates order-dependent freeze times — P1-214/P1-200

`commandMappedRemoteFrames()` awaits each remote command in a loop. Frame F1 may enter `printing` while F2/F3 remain `selecting` for the duration of F1 preparation and transport.

Thus even if `prepare-print` is treated as an implicit freeze, a multi-frame save has no atomic/equivalent selection cut: later children remain mutable longer, and the selection generation can depend on iteration/latency order.

### Block 15 — worker accepts metadata and physical generation as separate inputs — P0-070 boundary

`WEBCLIP_GENERATE_PDF` sanitizes the supplied content `meta` and calls the PDF generation path. No worker-side comparison can reconstruct which exact local/remote selection state physically produced the live prepared DOM unless content supplies a generation-bound receipt.

The worker sanitizer is authoritative for message shape, not a substitute for selection-generation provenance.

### Block 16 — download and Yandex share the same freeze ordering — P0-070

Both current save destinations build metadata before `prepareForPrint()`. This is not a download-only UI race; the same selection-generation contract must bind PDF bytes, upload metadata and Journal entry regardless of destination.

## Blocks 17–30 — WebClip marker writes synchronously execute the untrusted page

### Block 17 — top Include marker is written before Map authority — P0-075

`addInclude()` allocates an id, calls `element.setAttribute(INCLUDE_ATTR, id)`, then performs `state.includes.set(id, element)`.

There is a synchronous page-visible DOM mutation between admission checks and authoritative Map commit.

### Block 18 — top Exclude has the same ordering — P0-075

`addExclude()` likewise writes `EXCLUDE_ATTR` before `state.excludes.set(...)`. The reentrancy boundary is not Include-specific.

### Block 19 — isolated-world `setAttribute` triggers main-world custom-element callback — managed Chromium proof

A CDP-created isolated world called `setAttribute('data-webclip-pdf-include', '42')` on a page-defined custom element whose `observedAttributes` contained that name.

The page's main-world `attributeChangedCallback()` ran immediately and recorded the mutation. This proves isolated JavaScript globals do not make shared DOM mutation non-reactive.

MDN's custom-elements contract independently documents that `attributeChangedCallback()` runs when an observed attribute is added, removed or changed.

### Block 20 — page callback can disconnect the target before Map commit — P0-075/P0-080

Managed isolated-world fixture: the page callback removed the selected custom element while isolated code was still inside `setAttribute()`.

When isolated code resumed, the saved element reference already had `isConnected === false`. Current `addInclude()` would then insert that disconnected reference into `state.includes` because no post-marker live validation exists.

### Block 21 — page callback can strip the marker while leaving target connected and visible — P0-075

Managed fixture kept a 120×50 custom element connected/visible but synchronously removed the Include marker in its callback.

After the current-like Map commit: Map size was 1, target remained connected, but `hasAttribute(data-webclip-pdf-include)` was false. Extension-side selection identity and marker-driven print authority diverged before the user handler returned.

### Block 22 — page callback can replace target with a marked clone — P0-075/P0-070

Managed fixture replaced the original custom element with a connected ordinary element carrying the same Include marker during `attributeChangedCallback()`.

After the outer mutation resumed, the Map pointed to the disconnected original while the live page contained a different marked element. Current print CSS is marker-based, so this can immediately split snapshot identity from physical print identity.

This is stronger than a later hostile marker move: WebClip itself synchronously triggers the page code that performs the split.

### Block 23 — page CSS alone can invalidate rendered admission after marker write — P1-228/P0-075

Fixture stylesheet: `[data-webclip-pdf-include]{display:none!important}`.

Before marker write, target rect was 160×70. Immediately after marker write, rect was 0×0 and computed display was `none`, while the node remained connected.

Current `isUsableCandidate()` runs before `addInclude()` and is not repeated after page CSS reacts to the marker.

### Block 24 — main-world callback can synchronously dispatch a click back into isolated world — P0-075

Managed cross-world fixture installed a capture click listener in the isolated world. A page custom-element callback invoked `otherElement.click()` while the isolated world was inside marker `setAttribute()`.

The isolated listener observed the synthetic click with `isTrusted=false` **before** `setAttribute()` returned and before the model's Map commit flag became true.

This directly proves cross-world selection-handler reentrancy, not merely DOM mutation.

### Block 25 — reentrant child Include can bypass parent normalization — P0-075/P1-228

A current-like isolated selection model selected parent custom element A. A's marker callback synchronously clicked nested B before A entered the Map.

Observed mutation order:

`reentrant-click-b -> add:b -> add:a`

Final Map contained **both B and A**. Under ordinary non-reentrant `handleIncludeClick(A)`, A is supposed to swallow an existing nested B. Because normalization checks ran before the page callback, the callback inserted B after the checks and before A's commit.

### Block 26 — the same reentrancy can bypass independent visual-overlap admission — P1-228/P0-075

`handleIncludeClick()` tests existing Includes for containment/visual overlap before calling `addInclude(candidate)`. A page callback triggered by A's marker can add another independently overlapping candidate after that test but before A's Map commit.

Therefore an authority-bearing precondition is not stable across the shared-DOM mutation; final state can violate an invariant the handler just checked.

### Block 27 — removal paths are also page-reentrant before authority deletion — P0-075

`removeInclude()` / `removeExclude()` remove page attributes before deleting their Map entries. A custom-element callback for marker removal therefore runs while the old selection identity is still authoritative in the extension Map.

A robust mutation cannot assume marker cleanup is an inert operation.

### Block 28 — clear/cleanup inherits the same callback surface — P0-075

`clearSelections()` iterates selected elements and removes their marker attributes before clearing Maps. Even if final `.clear()` usually collapses reentrant additions, page callbacks can execute arbitrary page-side behavior and synthetic events during what WebClip treats as cleanup.

Selection cleanup must be designed as an untrusted boundary, not a series of inert DOM writes.

### Block 29 — ordinary element without reactive marker CSS/custom-element behavior is a positive control

The new finding is not that `setAttribute()` generically corrupts selection. Ordinary elements with no page reaction keep the expected marker and geometry in the managed controls.

The defect is that correctness currently **depends** on the host page choosing not to react to a predictable extension marker.

### Block 30 — this refines, rather than duplicates, forged-marker evidence

Historical P0-075 evidence already proves the page can independently forge/remove/move WebClip marker attributes and that print CSS must not trust them.

Blocks 17–28 add a different execution boundary: WebClip's own marker mutation can synchronously invoke page code **inside the selection transaction**, before extension state commits. The required architecture remains P0-075: page-owned DOM cannot be the transactional control plane for privileged selection/output authority.

## Blocks 31–42 — locator materialization is not bounded before Chrome message admission

### Block 31 — top locator `id` is unbounded before snapshot construction — P1-168/P1-172

Top `createSimpleElementLocator()` stores `id: String(element?.id || '')` with no character slice. The worker later limits imported/received locator id, but the sender has already allocated and serialized the full value.

### Block 32 — top class count is capped but individual class token length is not — P1-168/P1-172

Top takes at most eight classes but does not slice each class string. Chromium accepted a single class token of **500,000 characters**; the current-like locator JSON for `{classes:[token]}` was about **500,016 characters**.

A count cap is not a byte/string-work cap.

### Block 33 — top locator `tag` is also page-controlled and unbounded — P1-172

Chromium successfully created custom element local names above 100,000 characters. Top locator copies `localName` without a length bound.

This is not a common-page performance concern; it is an adversarial input boundary before extension messaging.

### Block 34 — structural `cssPath` can duplicate the complete huge id — P1-168/P1-172

`buildStructuralCssPath()` applies `CSS.escape(current.id)`, builds `#<escaped-id>`, and uses that selector when unique. The locator then carries both the original full `id` and full escaped id inside `cssPath`.

One page string can therefore be materialized multiple times before worker admission.

### Block 35 — `CSS.escape` may amplify control-character ids — managed Chromium proof

For 100,000-character test strings:

- ordinary letters: escaped length 100,000;
- repeated U+0001 control characters: escaped length **300,000**;
- repeated leading digit pattern: approximately 100,003.

Early input bounds must be applied before escape/selector construction, not only to the finished worker-side field.

### Block 36 — huge selector is parsed by `querySelectorAll` before any worker bound — P1-168

With a 1,000,000-character ASCII id, Chromium successfully produced a 1,000,001-character `#...` selector and `querySelectorAll()` resolved the unique element.

Measured on the managed fixture, CSS escaping alone took about 8.6 ms for the 1M input. The exact timing is environment-specific; the important invariant is that parser/string work is proportional to page-controlled input before any IPC sanitizer runs.

### Block 37 — one 1M id already creates ~2M locator JSON characters — managed Chromium proof

A minimal current-like locator containing full `id` plus full `cssPath` for the 1,000,000-character ASCII id serialized to approximately **2,000,060 JSON characters**.

The actual WebClip locator adds more fields and may repeat frame locators, so this is a lower-bound demonstration rather than a worst-case claim.

### Block 38 — Chrome message passing has a finite 64 MiB envelope — P1-172

Current Chrome extension messaging documentation states that one-time extension messages are JSON-serializable and documents a **64 MiB maximum message size**. WebClip supports Chrome versions where this JSON serialization contract applies.

Using the measured simple `~2*n + 60` ASCII-id shape, a single id around **33,554,403 characters** is already sufficient to cross 64 MiB before accounting for the rest of `meta`. The exact threshold is illustrative; acceptance must impose a much smaller product bound, not aim at the browser transport ceiling.

### Block 39 — worker `sanitizeSelectionSnapshot()` is a valid second-boundary positive control

Worker sanitization limits `cssPath` to 4000, `id` to 512, tag and other fields, framePath count, list count and total snapshot envelope.

Preserve these checks. The finding is specifically that they execute **after** the content/frame sender has performed locator construction and attempted message serialization.

### Block 40 — frame-agent improves scalar bounds but leaves `cssPath` unbounded — P1-168/P1-172

Child locator slices `id` to 512 and each class to 240, which is a useful positive control and should be mirrored top-side.

However child `cssPath(el)` still embeds the complete page id before `WEBCLIP_FRAME_AGENT_STATE` is sent. Thus the child→worker transport can still carry page-controlled oversized selector strings even though the separate `id` scalar is capped.

### Block 41 — frame-agent `tag` remains unbounded before child→worker messaging — P1-172

Child locator copies `String(el.localName).toLowerCase()` without an early character bound. The worker's later `tag.slice(...)` cannot bound the sender-side string or message already built.

### Block 42 — frame paths can multiply sender-side locator work before worker truncation — P1-168/P1-172

Top selection locators include a locator for every same-origin frame in `buildFramePath()`. Worker later truncates imported framePath to 16 entries, but top construction has already walked and materialized the full available chain.

Acceptance is therefore: bound each scalar and frame depth **before** selector construction/snapshot/message serialization, then keep worker sanitization as an authoritative independent second boundary. Do not silently rely on worker truncation to make sender-side work safe.

## Blocks 43–50 — a state snapshot is not automatically live selected-DOM truth

### Block 43 — top serialization does not filter disconnected Map entries — P0-080

`serializeSelectionSnapshot()` maps every value in top Include/Exclude Maps through `createElementLocator()` before the final count slice. There is no `isConnected` filter at this boundary.

Historical P0-080 already owns ordinary same-document stale local selection; this block preserves the direct connection to the new save-freeze contract.

### Block 44 — frame-agent `snapshot()` also serializes every Map entry without `isConnected` — P0-080/P1-200

Child `snapshot()` is simply the locator mapping of all Include/Exclude Map values. A child `get-state` response can therefore be structurally fresh as a transport response while semantically stale as selected-DOM evidence.

### Block 45 — same-document child SPA replacement does not create a new browser document identity — P0-080 boundary

A cross-origin child can perform History API/same-document application replacement while its injected frame-agent and Maps survive. This is the same application-generation distinction P0-080 already establishes for the top document; P1-171's child `documentId` fence does not solve same-document application replacement by itself.

No new frame-specific P-code is needed.

### Block 46 — child DOM removal does not automatically send a corrected state — P0-080

There is no general child MutationObserver that prunes Include/Exclude Maps when selected nodes are detached. Unless some later selection command sends state for another reason, top cached remote count can continue representing the old child selection.

### Block 47 — plain `get-state` is not sufficient final reconciliation — P0-080/P0-070

Because `get-state` returns `snapshot()` from the unpruned Maps, adding one last `get-state` immediately before save would still accept disconnected child references as current selection.

The required save freeze must include live-admission/pruning semantics, not just transport freshness.

### Block 48 — detached child selection and marker-driven print representation can disagree — P0-070/P0-080

A detached Include remains in the child Map/snapshot, while the child print stylesheet operates on connected DOM marker matches. The metadata can therefore describe a selected locator that physically contributes no current printed content.

This is an end-to-end reason the frozen receipt must represent actual current selected scope, not raw Map cardinality.

### Block 49 — custom-element reentrancy can create stale state without any navigation — P0-075/P0-080

Block 20 showed an element can become disconnected synchronously during WebClip's own selection commit. Thus “validate only on History API navigation” would be insufficient.

Live-selection validation must cover mutation at commit/freeze time even when URL, browser documentId and application route are unchanged.

### Block 50 — full document navigation remains a distinct positive boundary owned by P1-171/P0-070

Existing child documentId/registry work remains necessary for real frame navigation/replacement. This tranche does not collapse browser-document identity into P0-080.

The composed rule is:

- P1-171 proves exact child browser document identity;
- P0-080 proves current same-document/live selected DOM within that document;
- P1-200 proves exact selection-session/freeze generation;
- P0-070 binds that frozen selection receipt through metadata, physical PDF and Journal/save finalization.

## Dedup / owner decision

No new P-number is allocated.

- Existing **P0-070** is the exact owner for save authority crossing review → metadata → print → download/upload/Journal.
- Existing **P1-200** is the exact remote selection-session owner; review/freeze is a missing phase of that protocol.
- Existing **P1-214** owns multi-frame prepare settlement and now gains the requirement that its receipts consume a frozen selection generation.
- Existing **P0-075** already declares the host page untrusted for selection/control authority; synchronous custom-element/CSS reentrancy is a stronger execution proof for that same root.
- Existing **P0-080** already separates application/live DOM generation from documentId; child same-document and immediate-disconnect cases are refinements.
- Existing **P1-228** owns rendered candidate/admission semantics before and after marker-reactive page changes.
- Existing **P1-168/P1-172** explicitly own early page-controlled locator/selector bounds and pre-IPC metadata bounds.

Repository search found no prior durable `attributeChangedCallback` selection-marker finding and no prior P1-172 locator/cssPath pre-IPC evidence. Historical forged-marker and SPA evidence remain valid but do not contain these new execution schedules.

## Required implementation contract

1. Introduce one exact **selection freeze/save generation receipt** covering top + every selected permitted remote frame.
2. Entering review either freezes remote mutation immediately or explicitly keeps review non-authoritative and requires a final atomic/reviewed freeze before Proceed. No post-review child state becomes save authority silently.
3. Metadata is built from the exact frozen receipt, not mutable `remote.snapshot` caches.
4. `prepare-print` consumes the same receipt/generation and rejects stale/newer child selection state; multi-frame fan-out cannot create different per-frame selection cuts.
5. State events after freeze are either fenced as next-session state or invalidate/restart confirmation; they cannot rewrite the current save's selection.
6. Freeze/prune validates connected/current rendered selection according to P0-080/P1-228, not only Map membership or a plain `get-state` response.
7. Page-visible selection markers are not transactional authority. Prefer a page-nonreactive/private representation; if page DOM must be mutated, treat it as untrusted reentrant code and validate postconditions after the mutation with an exact generation.
8. Selection Map/marker mutations are linearizable: page callback reentrancy cannot create nested/overlapping state that bypasses prechecks, replace the target, or leave Map/print identity split.
9. Apply per-field and aggregate string/byte/depth bounds **before** `CSS.escape`, selector parsing, sibling/path construction and message serialization. Use shared constants/grammar across top/frame/worker where practical.
10. Preserve worker SelectionSnapshot sanitization as the independent authoritative receiver boundary; early sender bounds are not a reason to weaken import/worker validation.
11. Exceeding an early locator/snapshot budget degrades truthfully (bounded locator/fallback/warning) rather than silently emitting a huge message or pretending the portable snapshot is complete.

## Deterministic regression requirements for closure

Remote freeze/save:

- Finish with remote `{A}` -> child attempts state mutation before Proceed: current save either remains exactly `{A}` or confirmation is invalidated/restarted; it never silently adopts `{A,B}`.
- build meta with remote `{A}` -> child removes A before prepare: metadata and physical print cannot diverge.
- build meta with remote `{}` plus a local Include -> child adds B before prepare: B cannot appear in current PDF unless the current frozen receipt/metadata also contains B and user authority is re-established.
- two remote frames with reversed/delayed prepare order: both consume one frozen selection generation; later frame cannot mutate while waiting and become a different cut.
- state event from a newer selection generation after freeze cannot replace current-save cached authority.
- once freeze is accepted, child `prepare-print` verifies exact freeze/session/document generation.

Host-reentrant mutation:

- custom element observes Include marker and removes itself during marker write: no disconnected Map authority is committed.
- custom element strips marker while remaining connected: Map/physical print identity cannot diverge.
- custom element replaces itself with a marked clone: replacement is not silently authorized.
- marker-triggered CSS hides/moves candidate: post-mutation admission detects the changed rendered target or marker is kept outside page style authority.
- callback dispatches synthetic click during Include commit: reentrant click cannot create a nested/overlapping Include that bypasses invariants.
- repeat for Exclude and for marker removal/cleanup.

Pre-IPC budgets:

- 1 MiB hostile id/class/custom-tag fixtures: sender locator output is bounded before selector/message construction; test does not need to approach browser OOM/64 MiB transport failure.
- control-character id demonstrates bound occurs before `CSS.escape` amplification.
- same tests in frame-agent: child→worker message stays within sender budget.
- deep same-origin frame path: sender applies depth/count/byte budget before materializing the whole portable path.
- ordinary realistic locators preserve current restore quality and worker second-boundary checks.

Live selection:

- selected local/remote node removed after review but before freeze: save is invalidated/degraded, not counted as live.
- child same-document SPA replaces selected subtree: `get-state`/freeze cannot bless disconnected old Map entries.
- full child document navigation still follows P1-171 and does not regress exact document fencing.

## External platform controls

Two current platform references were checked only to validate browser mechanics, not to infer WebClip defects:

- Chrome for Developers, **Message passing**: extension one-time messages are JSON-serializable and the documented maximum message size is 64 MiB for the reviewed contract. This supports P1-172's pre-IPC admission requirement.
- MDN, **Using custom elements**: `attributeChangedCallback()` runs when an observed attribute is added/changed/removed. Managed Chromium isolated-world probes independently reproduce the exact cross-world callback/reentrancy behavior relevant here.

## Test / release interpretation

This is audit evidence only. No P-owner is implemented or closed by this document. Existing repository CI remains the engineering gate; the managed Chromium probes are deterministic evidence but not a real unpacked-extension release run. Real optional-host-permission/cross-origin frame QA and real Yandex E2E remain separate release requirements.

`manifest.json` remains `0.9.8`; no build, tag or GitHub Release is implied.