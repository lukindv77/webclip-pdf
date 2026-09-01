# Research family evidence — PDF/print / offscreen resource lifetime / live-DOM rollback / source generation

Family from `RESEARCH_DELTA_INDEX.md` section 12.

This document is a **lossless consolidation** of the detailed research deltas listed below. Current status and single-owner authority remain in `RESEARCH_REGISTRY.md`; this file preserves source proof, deterministic schedules, corrections, positive controls, acceptance cases and historical test/release interpretation.

Every retired source is embedded verbatim below and identified by its original filename plus SHA-256. Git history remains the secondary recovery path.

Primary owners from the navigation index: P0-003, P0-023, P0-063, P0-065, P0-067, P0-068, P0-070, P0-071, P0-075, P0-080, P1-069, P1-149…P1-153, P1-167, P1-199, P1-212…P1-214, P1-218…P1-224.

Retired source count: **26**.

## P-code coverage

P0-004, P0-007, P0-020, P0-023, P0-030, P0-039, P0-045, P0-051, P0-063, P0-065, P0-066, P0-067, P0-068, P0-070, P0-071, P0-073, P0-074, P0-075, P0-076, P0-079, P0-080, P1-001, P1-003, P1-004, P1-038, P1-043, P1-054, P1-086, P1-147, P1-149, P1-156, P1-157, P1-169, P1-171, P1-175, P1-184, P1-195, P1-196, P1-197, P1-198, P1-199, P1-200, P1-201, P1-203, P1-210, P1-211, P1-212, P1-213, P1-214, P1-217, P1-218, P1-219, P1-220, P1-221, P1-223, P1-224, P2-018, P2-020

## Source ledger

| Original delta | SHA-256 | P-codes mentioned | Original title |
|---|---|---|---|
| `RESEARCH_DELTA_CONTENT_SOURCE_TAB_BINDING_2026-08-27.md` | `e44a460bd4f7eb48175e5983f7b965dc7e2fe5ddd87241ac3eb27c231b2184bb` | P0-030, P0-045, P0-051, P1-157, P1-171, P1-175, P1-199 | Research delta — content source-tab binding — 2026-08-27 |
| `RESEARCH_DELTA_CONTENT_TEMPLATE_DISCLOSURE_2026-08-27.md` | `32532fa0b5dde26691653b42aba3710d45b0cc0ef14fba979df420efbe7bf59a` | P0-066, P0-075, P0-079, P1-157, P1-198 | Research delta — content template disclosure boundary — 2026-08-27 |
| `RESEARCH_DELTA_FLATTENED_FRAME_PROXY_ACTIVE_CONTENT_2026-08-28.md` | `dbebd97a6f2d061688204af233de216730fd7442cbc7e6dd2cded93f9ab61c3b` | P0-004, P0-071, P0-075, P1-212, P1-213 | Research delta — flattened same-origin frame proxy must be inert — 2026-08-28 |
| `RESEARCH_DELTA_FRAME_LAYOUT_STYLE_ROLLBACK_STALE_HOST_MUTATION_2026-08-29.md` | `acafeb77d5608d3eb26b8e9588d56bb53211694d16818a507bdbdb0146ffefbb` | P0-075, P1-149, P1-223, P1-224 | Research delta — frame/ancestor print-layout rollback must not overwrite newer host styles — 2026-08-29 |
| `RESEARCH_DELTA_FROZEN_PRINT_CONTENT_GENERATION_2026-08-28.md` | `a35803278fb13935733e2b994a31d095d217573eedc19ae17873f9a83bb31ef0` | P0-004, P0-067, P0-068, P0-071, P0-075, P1-199, P1-200, P1-203 | Research delta — frozen print content generation — 2026-08-28 |
| `RESEARCH_DELTA_FROZEN_PRINT_REPRESENTATION_SHARED_DOM_MARKERS_2026-08-28.md` | `ebf19f9ec3c89d206fcf27ffd98a7fbfc49d0064137cd660ec70b72194f6080c` | P0-004, P0-070, P0-071, P0-075, P1-171, P1-199, P1-200, P1-201, P1-211 | Research delta — frozen print representation vs shared-DOM marker mutation — 2026-08-28 |
| `RESEARCH_DELTA_HOSTILE_SELECTION_MARKER_CAPABILITY_2026-08-28.md` | `186035d90ef387aada1db5409059cb71fe9f0c759c1d9d14b6ac6e46c34ff950` | P0-004, P0-020, P0-039, P0-067, P0-068, P0-071, P0-075, P0-079, P1-184, P1-198, P1-199, P1-200, P1-201, P1-203, P1-210, P1-211 | Research delta — hostile selection marker / synthetic WebClip UI capability — 2026-08-28 |
| `RESEARCH_DELTA_HOST_CONTROL_PRINT_2026-08-27.md` | `9809b5a113acc57fc0fb20e11b09b7500cf9c4968b7fbd34a84ce1b7192c51a1` | P0-066, P0-071, P0-075, P0-079, P1-004, P1-171, P1-195, P1-196, P1-197, P2-020 | Host-page control plane / print URI research delta — 2026-08-27 |
| `RESEARCH_DELTA_LINK_NORMALIZATION_ROLLBACK_AUTHORITY_2026-08-29.md` | `64d023e7e59461ce4f91426c28eb9699dd2854e05962690ca1a4595e89c19f0e` | P0-071, P0-075, P1-220, P1-221 | Research delta — live link normalization rollback needs CAS and private receipt — 2026-08-29 |
| `RESEARCH_DELTA_OFFSCREEN_MEMORY_LIFETIME_2026-08-27.md` | `f2191a65b64e976ba25503875fade36fc685eca0544fed9d7f54711477ec6ba5` | P0-063, P0-065, P1-054, P1-156, P1-169, P2-018 | Research delta — offscreen memory admission and Blob lifetime — 2026-08-27 |
| `RESEARCH_DELTA_OFFSCREEN_RESOURCE_IDB_2026-08-27.md` | `930805f4a57b0a42eb8d6c177f4a8c05fb1d1e1834914f27d06a0dfdc4d07bce` | P0-079, P1-038, P1-054, P1-086, P1-156, P1-169, P1-195, P1-196, P1-197, P2-020 | Offscreen resource / IndexedDB research delta — 2026-08-27 |
| `RESEARCH_DELTA_PDF_CACHE_CONSUMER_LIFECYCLE_2026-08-27.md` | `f206a5323088c1da0f39e81e981f06bb60e3f721078dec6a3987eafa40f391e4` | P0-023, P0-079, P1-043, P1-184, P1-198, P1-199 | Research delta — PDF cache consumer/lifecycle ownership — 2026-08-27 |
| `RESEARCH_DELTA_PDF_CACHE_OPERATION_ISOLATION_2026-08-27.md` | `e785d8f7839d9008c815e6d14b7aecd330d74ea186a3a4282653e5cdbc415a72` | P0-023, P0-079, P1-043, P1-184, P1-195, P1-196, P1-197, P1-198, P2-020 | Research delta — PDF retry-cache operation isolation — 2026-08-27 |
| `RESEARCH_DELTA_PDF_END_TO_END_PROVENANCE_2026-08-27.md` | `14a8904960c0d77a8c321020a9a4245d9eec70392f71edd2e8870f60ac28ab0c` | P0-023, P0-070, P0-073, P0-074, P0-076, P0-079, P1-147, P1-184, P1-197, P1-198, P1-199, P1-200, P1-201 | Research delta — end-to-end PDF document/content provenance — 2026-08-27 |
| `RESEARCH_DELTA_PDF_PREPARATION_SIDE_EFFECTS_2026-08-27.md` | `bd83450de73acb9ea17341d8a3ffc547a9485e1e625a152c288ee01886dfabc0` | P0-067, P0-068, P0-071, P0-075, P1-003 | Research delta — PDF preparation side effects — 2026-08-27 |
| `RESEARCH_DELTA_PDF_RETRY_CACHE_APPLICATION_GENERATION_2026-08-28.md` | `c1bf5df704a97f2547a58039149389c7147d4415ea2fedc0a8c4d4bfbc9c21e8` | P0-007, P0-023, P0-070, P0-080 | Research delta — PDF retry cache needs same-document application generation — 2026-08-28 |
| `RESEARCH_DELTA_PDF_RETRY_CACHE_SPA_APPLICATION_GENERATION_2026-08-28.md` | `56cefef53a44a75daaceceacf719a8d3397fb3b85e33819465c1a9a092a31089` | P0-007, P0-023, P0-070, P0-079, P0-080, P1-198, P1-210 | Research delta — PDF retry cache needs explicit SPA/application-generation semantics — 2026-08-28 |
| `RESEARCH_DELTA_PREPARED_DOCUMENT_DEBUGGER_HANDOFF_2026-08-28.md` | `fc938267e4a3a4c860479a5a64ddab201b6bec0198bd4529ab2cdc2c36cc5ff0` | P0-004, P0-070, P0-075, P0-079, P1-147, P1-198 | Research delta — prepared document to debugger PDF handoff — 2026-08-28 |
| `RESEARCH_DELTA_PRINT_HEADER_TEXTUAL_ID_CLEANUP_2026-08-29.md` | `77b3c32c3e647184d4c9fe92be19107364c41466f54d0539cb869709f8bbe671` | P0-075, P1-219, P1-220 | Research delta — print-header cleanup must remove the exact generated node — 2026-08-29 |
| `RESEARCH_DELTA_PRINT_IMAGE_WRAPPER_STRUCTURAL_ROLLBACK_2026-08-29.md` | `4ea8edff3622fd88e7dea0e9dab0a5046401add6b3a6611393e7db6201d8afeb` | P0-004, P0-071, P0-075, P1-218, P1-219 | Research delta — temporary PDF image wrappers need structural rollback ownership — 2026-08-29 |
| `RESEARCH_DELTA_PRINT_PREPARATION_PAGE_CONTROL_ACTIVATION_2026-08-28.md` | `2f2dd35c413eb32ed22ecc5a6cf7a20e46c368dd9f9e30ef52021b70e966d0c1` | P0-004, P0-070, P0-075, P1-212 | Research delta — print preparation must not activate page-owned controls — 2026-08-28 |
| `RESEARCH_DELTA_PRIVACY_PRINT_BOUNDARY_2026-08-27.md` | `8fb6462d28db461df9e478c69e1c8de55f436cafcc040a4e9812868f3eb62470` | P0-066, P0-068, P0-071, P0-079, P1-195, P1-196, P1-197, P2-020 | URL privacy / flattened print boundary research delta — 2026-08-27 |
| `RESEARCH_DELTA_RESOURCE_PREFETCH_ROLLBACK_REMOTE_FRAME_PARITY_2026-08-29.md` | `92717e831221c6e05d5acce264ca975d10f81eeb49de0116a6c067eff81ec4b3` | P1-214, P1-218 | Research delta — P1-218 remote-frame resource rollback parity — 2026-08-29 |
| `RESEARCH_DELTA_RESOURCE_PREFETCH_ROLLBACK_STALE_HOST_MUTATION_2026-08-29.md` | `9674f85ab0ff9617d79cc34fdfa2733ae34f46e3776b29fa2b8cbb64893c0e1f` | P0-067, P0-071, P0-075, P0-080, P1-003, P1-212, P1-217, P1-218 | Research delta — resource-prefetch rollback must not overwrite newer host DOM — 2026-08-29 |
| `RESEARCH_DELTA_SPA_SAME_DOCUMENT_SELECTION_GENERATION_2026-08-28.md` | `f7f24e987ca68aafdf6cb45b42436d407db4b456fea00f9ac9d81f5420b2f372` | P0-004, P0-023, P0-030, P0-070, P0-071, P0-075, P0-080, P1-001, P1-171 | Research delta — SPA / same-document selection generation authority — 2026-08-28 |
| `RESEARCH_DELTA_SPA_SAVE_CONFIRMATION_GENERATION_2026-08-28.md` | `4957357bac37fd37b1e6a25681a4952be2b1f4b99bcd95a5e43f26e2edc897ef` | P0-070, P0-075, P0-080, P1-157, P1-171, P1-210 | Research delta — Save confirmation must remain bound to SPA/application generation — 2026-08-28 |

## Lossless source transcripts

The sections below preserve the original UTF-8 Markdown text verbatim. Historical statements remain evidence, not independent current status authority; `RESEARCH_REGISTRY.md` controls status/ownership.
## Retired source: `RESEARCH_DELTA_CONTENT_SOURCE_TAB_BINDING_2026-08-27.md`

SHA-256 of UTF-8 source text: `e44a460bd4f7eb48175e5983f7b965dc7e2fe5ddd87241ac3eb27c231b2184bb`

# Research delta — content source-tab binding — 2026-08-27

Baseline HEAD before this research block: `36f2ba4960e1df7a17a9367e80c9e8ef2a1e7900`.

Docs-only research checkpoint. Production runtime and `manifest.json` are unchanged. Canonical large-table synchronization is not claimed.

## Scope

Fresh confused-deputy research of content-allowed runtime commands that open a tab/window, focused on existing `P0-030` sender-bound content payload authority and `P0-051` saved-file site binding.

## Result

`P0-030` should be refined to cover caller-provided **tab/frame identifiers**, not only URL/title/meta fields. Three content-allowed navigation handlers accept `message.sourceTabId` ahead of the authoritative `sender.tab.id`. The worker then uses that id with privileged `chrome.tabs.get()` to choose another tab's window/index as placement authority for the new tab.

No new P-number is created. `P1-199` remains free.

## Exact runtime proof

### 1. Content allowlist

The content-script message allowlist includes:

- `WEBCLIP_OPEN_JOURNAL_SAVED_FILE`;
- `WEBCLIP_OPEN_OPTIONS`;
- `WEBCLIP_OPEN_URL`.

`WEBCLIP_OPEN_INTERNAL_PAGE` is not content-allowed, which is a positive control: content cannot use this issue to request an arbitrary extension HTML page.

Incognito content is additionally restricted by `assertRuntimeMessageSender()`; only cache invalidation and `WEBCLIP_OPEN_OPTIONS` remain allowed from an Incognito sender. Those existing privacy rules must remain.

### 2. The three content-allowed open handlers trust caller sourceTabId

Each affected handler computes:

`const sourceTabId = Number(message.sourceTabId || sender.tab?.id || 0);`

This makes an untrusted content payload authoritative whenever it supplies a non-zero `sourceTabId`, even though `sender.tab.id` is already available from Chrome and is the correct source-tab identity for a content sender.

The saved-file handler still performs the valuable `P0-051` siteKey check before opening a Yandex public link, and `WEBCLIP_OPEN_URL` restricts content to allowed Yandex public-link hosts. Those URL/content-authority gates are not bypassed by this finding.

The defect is the independent **placement/tab-context authority**.

### 3. createTabNextTo performs privileged lookup of the supplied tab

`createTabNextTo(sourceTabId, url, active)` calls bounded `chrome.tabs.get(sourceTabId)`.

If that lookup succeeds and exposes an integer index, the worker copies:

- `source.index + 1` into the new tab's index;
- `source.windowId` into the new tab's windowId.

The caller therefore influences which existing browser window/index becomes the placement context for a new privileged extension/Yandex tab.

The worker does not compare the supplied id with `sender.tab.id` for content senders.

### 4. Consequence classification

This pass did **not** find a broad data exfiltration from the chosen source tab:

- source URL/title are not returned to the content caller;
- `createTabNextTo()` uses source metadata only internally for placement;
- the response exposes the id of the newly created tab, not the private metadata of the chosen existing source tab;
- content still cannot request arbitrary `chrome://`, `file:`, `data:` or arbitrary HTTPS targets through these handlers.

Therefore the confirmed issue is a confused-deputy/tab-context integrity problem inside existing `P0-030`, not a new cross-tab confidentiality P0.

It can still cause UI/context confusion and cross-window placement if a content caller knows or guesses another tab id. A compromised content-side caller must not gain additional Chrome tab authority merely by supplying an integer that the background page can resolve with its broader tabs privilege.

### 5. Safer neighboring paths

Other content-authorized control paths already demonstrate the correct pattern:

- PDF generate/upload/retry derive the active tab from `sender.tab.id`;
- frame-agent LIST/TARGET derive the containing tab from `sender.tab.id`, with top-frame/child-frame sender checks;
- `WEBCLIP_ENABLE_FRAME_AGENTS` accepts explicit `message.tabId` only from an extension-page sender, not content.

The open/navigation handlers should follow the same sender-bound rule.

## Required P0-030 refinement

For `senderKind === 'content'`:

- ignore/reject caller-provided `sourceTabId` and use only `sender.tab.id` as placement/source authority;
- more generally, any tabId/frameId/documentId field supplied in a content message must be treated as untrusted unless the worker independently proves it belongs to the exact sender context/capability;
- never perform privileged `tabs.get()`/scripting/navigation against a caller-selected foreign tab solely because the content payload contains its numeric id;
- keep caller-supplied tab ids available only for trusted extension-page flows that genuinely need to address another tab, subject to their own document/generation fences (`P1-157`, `P1-175`, `P1-171`).

`P0-051` siteKey binding and the Yandex public-link host allowlist remain required; sender-tab binding is additional, not a replacement.

For Incognito, preserve `P0-045`: sender Incognito classification must be derived from Chrome's sender/tab context and cannot be bypassed by choosing a different sourceTabId.

## Required deterministic/browser regressions

1. Content sender in tab A sends `WEBCLIP_OPEN_OPTIONS {sourceTabId:B}`: worker ignores/rejects B and places relative only to A.
2. Content sender tries `WEBCLIP_OPEN_URL` with another known tab id: URL host policy still applies and foreign tab/window cannot become placement authority.
3. Content `OPEN_JOURNAL_SAVED_FILE` still requires exact current-site `P0-051` binding and also cannot use another tab as source authority.
4. Extension-page caller that legitimately specifies a target/source tab retains supported behavior under worker-owned exact-document/tab checks.
5. Incognito sender cannot change its privacy classification by passing a normal-profile tab id, and normal sender cannot make a foreign private tab its trusted source context.
6. Invalid/nonexistent source id from content does not trigger a privileged foreign lookup; sender-bound fallback is deterministic rather than caller-controlled.
7. Frame-agent commands remain bound to `sender.tab.id`/sender frame as today.

## Classification

- Extend existing `P0-030`; no new P0/P1 item.
- Preserve `P0-051` for content saved-file site binding.
- Preserve `P0-045` for Incognito privacy context.
- Preserve `P1-157`/`P1-175`/`P1-171` for trusted extension-page cross-tab/document operations.
- `P1-199` remains free.

Previous product test gate was not re-run by this docs-only checkpoint.

## Retired source: `RESEARCH_DELTA_CONTENT_TEMPLATE_DISCLOSURE_2026-08-27.md`

SHA-256 of UTF-8 source text: `32532fa0b5dde26691653b42aba3710d45b0cc0ef14fba979df420efbe7bf59a`

# Research delta — content template disclosure boundary — 2026-08-27

Baseline HEAD before this research block: `57c414cae7aa64bc528d6fd89bf946b510bba7a6`.

Docs-only research checkpoint. Production runtime and `manifest.json` are unchanged. Canonical large-table synchronization is not claimed.

## Scope

Fresh research of `WEBCLIP_JOURNAL_LIST` data returned to content UI and what becomes host-page-readable DOM. Existing owners: `P0-075` hostile-page/content-script DOM boundary, `P0-066` URL confidentiality, with `P1-157` for direct unbounded content runtime RPC.

## Positive boundary revalidation

For a content sender, service worker rebinds Journal lookup to `sender.tab.url` / current site rather than trusting arbitrary caller-provided URL authority.

The content template projection is also intentionally much smaller than a full Journal entry. `journalEntryForContentTemplate()` returns bounded template metadata plus sanitized selection snapshot and a boolean `hasPublicUrl`; it does **not** return Journal comments, `remotePath`, `resourceId`, `accountUid`, raw public URL or other Yandex credentials/locators.

The response is capped to 25 entries / approximately 8 MiB. This pass found no broad full-Journal disclosure through this RPC.

## Confirmed P0-075 / P0-066 disclosure

### 1. Template projection still contains full historical URL

`journalEntryForContentTemplate()` returns:

`url: normalizeImportedHttpUrl(entry?.url || '')`.

That normalizer preserves a valid HTTP(S) URL rather than producing the privacy-reduced origin/path representation required by P0-066. Query parameters, fragment and URL userinfo are therefore still present when stored entry metadata contains them.

### 2. Content UI renders the URL into open shadow DOM

When template cards are built, `content.js` creates `.journal-meta` and inserts:

`Источник: ${entry.url}`

whenever the historical entry URL differs from the current page URL.

The WebClip host uses the already-confirmed `attachShadow({ mode: 'open' })` design. A hostile page script can therefore traverse the predictable WebClip host's `shadowRoot` and read that text.

This turns data that was previously only inside extension storage/isolated-world JS into ordinary host-page-readable DOM.

### 3. Site-template mode widens the privacy boundary beyond one origin/URL

Site-template mode intentionally lists prior entries for the current `siteKey`, not only exact URL. Therefore a current page can cause the template list to contain historical URLs from other paths and potentially other subdomains under the same site grouping.

A full historical URL can carry capability-like or privacy-sensitive query values that the current page did not otherwise know. The site relationship does not make arbitrary host-page JavaScript an authorized reader of historical Journal metadata.

### 4. P0-075 synthetic control-plane makes passive secrecy insufficient

The existing hostile-page finding already proves WebClip UI controls do not require trusted user input. Page JavaScript can synthesize clicks against the accessible shadow UI while a WebClip session is active.

Therefore the design cannot rely on "the user would have to manually open the template picker" as a confidentiality boundary. Data should not be placed in host-readable DOM in the first place.

## Required P0-075 refinement

Sensitive/historical extension metadata used only by WebClip UI must not be exposed through host-owned/open DOM.

At minimum:

- historical source URL/title/template metadata must not be rendered into a host-readable open shadow tree if it is not safe for page disclosure;
- fixing only `mode:'closed'` is not a complete security model because other P0-075 page-visible markers/print nodes/events still exist; use an extension-owned UI surface or another isolation model for sensitive controls/data;
- synthetic host clicks must not authorize template-list disclosure or other privileged user workflows.

## Required P0-066 refinement

Even inside extension-owned UI, historical source URLs should use a purpose-specific representation.

For template comparison/routing retain separately normalized internal match keys. For user display, expose only a redacted form that cannot reproduce credential-like userinfo/query/fragment unless the product explicitly requires it and the display surface is trusted.

Do not use one full URL string simultaneously as:

- routing identity;
- historical storage metadata;
- template display text;
- host-page DOM content.

The existing OperationLog URL sanitizer already demonstrates a safer display-oriented pattern (`origin + pathname`, redacted query) but the exact template UX representation can be chosen independently.

## P1-157 relation

The template loader uses direct `chrome.runtime.sendMessage()` from content without a caller-side bounded/settlement helper. The worker bounds the returned entry count/size, but a stuck runtime channel and repeated UI actions are still part of the existing direct-RPC centralization item.

Do not solve confidentiality by adding a blind timeout/retry that can create overlapping template requests; use latest-generation/read-only request semantics if centralizing this path.

## Required regressions

1. Historical entry URL with `?token=secret#fragment` is not readable through host page `shadowRoot`/DOM.
2. Historical URL containing username/password userinfo is not exposed in template UI text.
3. Site-template entries from sibling path/subdomain do not disclose their full private URL to host page code.
4. Host synthetic `.click()` cannot authorize loading/revealing sensitive template metadata.
5. Content template RPC still never includes comments, remote path/resourceId/accountUid/raw public URL.
6. Exact/current-site template functionality remains available from a trusted extension-owned UI flow.
7. Internal URL/site matching remains correct after display redaction; no redacted display string is reused as destructive/routing authority.

## Classification

No new P-number created. Extend `P0-075` and `P0-066`; preserve `P1-157` for direct content RPC ownership.

`P0-079` remains evidence-reserved. `P1-198` remains free at this checkpoint.

Previous product test gate was not re-run by this docs-only research checkpoint.

## Retired source: `RESEARCH_DELTA_FLATTENED_FRAME_PROXY_ACTIVE_CONTENT_2026-08-28.md`

SHA-256 of UTF-8 source text: `dbebd97a6f2d061688204af233de216730fd7442cbc7e6dd2cded93f9ab61c3b`

# Research delta — flattened same-origin frame proxy must be inert — 2026-08-28

Docs-only research checkpoint. Runtime/config/manifest/tests are unchanged.

## Classification

**New P1-213** — a print-only flattened same-origin iframe representation must not re-execute page behavior or create new live browsing/network contexts merely because WebClip cloned it for pagination.

This composes with **P0-004** PDF fidelity, **P0-071** safe PDF URI semantics, **P0-075** hostile/shared-DOM trust and **P1-212** prohibition on activating page controls during print preparation.

## Source proof

For a selected same-origin iframe whose body is flattened, current `createFlattenedBodyFramePrintProxy()`:

1. creates a top-document `<section>` proxy;
2. clones every direct body child with `node.cloneNode(true)`;
3. enumerates the cloned descendants;
4. copies selected computed styles/URL state;
5. removes cloned `<script>` elements;
6. removes cloned descendants carrying the WebClip exclude marker;
7. appends the proxy directly to the live top document body;
8. hides the original iframe.

Removing `<script>` is useful, but it does not make the clone inert.

## Active content that survives a deep DOM clone

`cloneNode(true)` copies element attributes. Current sanitization does not strip or neutralize, for example:

- inline `onload`, `onerror`, `onclick`, `oninput`, etc. event-handler attributes;
- nested `<iframe src/srcdoc>` / `<frame>` browsing contexts;
- `<object data>` / `<embed src>`;
- media autoplay/preload behavior;
- form/action attributes and interactive controls;
- refresh/navigation-capable embedded document markup;
- active/local URI schemes beyond the separate link annotation rules.

Event listeners registered only via `addEventListener()` are not cloned, which is a useful limitation, but inline handlers and browser element activation/loading semantics remain relevant.

## Why insertion into the live document matters

The proxy is not kept detached. It is appended to `ownerDoc.body` in the top page.

Once connected, cloned resource/browsing elements may initiate behavior independently of the original iframe:

- a nested iframe may create another browsing context/load;
- an image/resource load failure/success can dispatch an event to copied inline handler attributes;
- object/embed/media resources may be loaded again;
- live form/interactive content becomes present in the top document;
- the host page can also observe and mutate the proxy under P0-075.

The save operation therefore risks changing page/network behavior merely to improve PDF pagination.

The original same-origin page already has authority to run its own scripts, so this is not claimed as a same-origin privilege escalation. The defect is **side-effect amplification caused by WebClip capture**: saving a page should not create additional active page executions or browsing/resource contexts that would not otherwise occur.

## Relationship to P1-212

P1-212 covers the explicit `control.click()` activation path.

P1-213 is separate: no synthetic click is necessary. Connecting a non-inert cloned subtree can itself activate browser/page behavior.

Both are naturally solved by a genuinely inert frozen print representation.

## Required contract

Before any flattened clone is connected to a live/render document, sanitize it into a print-only inert representation.

At minimum:

1. strip all `on*` event-handler attributes recursively;
2. neutralize executable/local-active URI schemes according to P0-071;
3. define explicit policy for nested `iframe/frame/object/embed` rather than cloning them live by default;
4. disable form submission/action and other interactive activation in the print representation;
5. define media policy so capture does not unexpectedly autoplay or duplicate side effects;
6. preserve only resources/attributes needed for accepted visual PDF fidelity;
7. do not run page scripts/handlers to recover fidelity;
8. preferably build the frozen representation under WebClip-owned control rather than exposing it in the live host tree.

If a resource must be fetched for rendering, it must follow the existing bounded/resource privacy policy and not inherit arbitrary active element behavior.

## Deterministic/browser regressions

1. Selected iframe body contains `<img src="missing" onerror="sideEffect()">` -> flattening never executes copied inline handler.
2. Body contains nested `<iframe src="/counter">` -> print proxy does not create an unapproved second live browsing-context load.
3. Body contains `<object data="...">` / `<embed src="...">` -> no implicit active load outside explicit print-resource policy.
4. Body contains autoplay media -> capture does not start a second playback merely because the proxy is mounted.
5. Inline `onclick`/form action remains visually representable but cannot become a live page action from the print proxy.
6. Normal text/images/tables preserve accepted P0-004 PDF appearance.
7. Scripts are absent as today, and all other executable event attributes are also absent.
8. Host-page mutation after frozen representation seal remains covered by P0-075/frozen-generation tests.
9. Nested same-origin selected iframe policy is explicit and bounded rather than recursively creating uncontrolled active clones.
10. Cleanup removes the inert proxy without executing late active teardown behavior.

## Numbering result

**P1-213 is assigned to this root cause.**

P0-004 remains PDF fidelity owner; P0-071 owns printable URI safety; P0-075 owns page mutation trust; P1-212 owns explicit page-control activation. P1-213 specifically owns active behavior caused by connecting flattened cloned content.

## Validation note

Documentation only. Product tests were not rerun; historical 88/88 JavaScript syntax + 74/74 deterministic PASS remains prior evidence only. Browser tests are required for inline event attributes and nested active elements. No build, tag or Release was created.

## Retired source: `RESEARCH_DELTA_FRAME_LAYOUT_STYLE_ROLLBACK_STALE_HOST_MUTATION_2026-08-29.md`

SHA-256 of UTF-8 source text: `acafeb77d5608d3eb26b8e9588d56bb53211694d16818a507bdbdb0146ffefbb`

# Research delta — frame/ancestor print-layout rollback must not overwrite newer host styles — 2026-08-29

Baseline `main` before this write: `632c8cd539abbb1706baaaa565ab95c584cdb8e1`.

Docs-only research checkpoint. Runtime, manifest, tests, build, tag and Release are unchanged.

## Classification

**New P1-224 — same-origin iframe/ancestor print-layout rollback restores a whole pre-print `style` snapshot and marker state without proving that the current state is still WebClip-owned.**

P1-149 owns the need to normalize selected iframe/ancestor layout and restore it. P1-224 adds the missing concurrent-ownership rule: “exactly restore the old inline style” is unsafe if the host legitimately changed that style after WebClip's temporary write.

## Source proof

`rememberFramePrintMutation()` captures only the pre-mutation state:

```js
{
  element,
  kind,
  oldStyle: element.getAttribute?.('style') ?? null,
  hadFrameInclude,
  oldFrameInclude,
  hadFrameChain,
  oldFrameChain
}
```

`applySelectedFramePrintFlow()` then modifies multiple inline style properties on the **live frame/ancestor DOM**.

At cleanup `restoreFramePrintMutation()` unconditionally replaces/removes the entire `style` attribute and restores/removes WebClip marker attributes:

```js
if (item.oldStyle == null) element.removeAttribute('style');
else element.setAttribute('style', item.oldStyle);
```

No temporary-style snapshot, generation receipt or compare-before-restore is checked.

## Deterministic stale rollback

1. Ancestor/frame element E has inline style S0.
2. WebClip print generation G snapshots S0 and applies temporary print normalization S1.
3. During print, SPA/layout code updates E's inline style to newer S2, for example responsive height/transform/overflow/position state.
4. G cleanup runs.
5. `restoreFramePrintMutation()` replaces the **entire** current `style` attribute with S0.
6. Every page-owned inline change made after G started is lost, including properties WebClip never intended to own individually.

Because the rollback writes the complete `style` string, one host update to any unrelated inline property can be destroyed.

The same ownership problem applies to `FRAME_INCLUDE_ATTR` / `FRAME_CHAIN_ATTR`: restoring from only old presence/value does not prove the current marker value is still G's temporary write. These markers are page-visible and can also be changed by the host or a newer WebClip generation.

## Required contract

Prefer P0-075's isolated/frozen print representation so host layout is not mutated.

While live normalization remains:

- capture exact temporary values/properties written by the preparation generation;
- rollback each owned property/marker only if the live value still matches the generation's temporary value;
- do not replace the whole `style` attribute from an old snapshot after any host change;
- preserve host changes to unrelated style properties;
- generation-token the frame/ancestor mutation set so G1 cleanup cannot undo G2 preparation;
- treat mismatch as `superseded-by-host`, not as a reason to force old layout back;
- if safe property-level rollback cannot be made reliable, move the normalization to a WebClip-owned print clone/proxy instead of live DOM.

## Required regressions

1. No host mutation after G -> exact original WebClip-owned style properties restore.
2. Host changes an unrelated inline style property while G active -> property survives cleanup.
3. Host changes a property also touched by WebClip -> host value survives; cleanup reports superseded.
4. Original element had no style attribute; host adds style during print -> cleanup does not remove it.
5. Old G1 cleanup cannot overwrite G2 frame normalization.
6. Marker attributes changed by host/newer generation are not restored/removed using stale G1 snapshot.
7. Same-origin iframe height stabilization still restores correctly when ownership remains exact.
8. P1-149 real-page regression remains valid after property-level/frozen rollback design.

## Duplicate check / numbering

Repository semantic search for `changedFrameStyles`, `oldStyle`, concurrent host style mutation, frame-layout rollback CAS found no dedicated existing research item. P1-149 specifies exact rollback to original inline styles but does not define compare-before-restore against newer host writes; P0-075 supplies the broader frozen-representation direction.

Current repository search found no `P1-224`; P1-223 is the latest assigned owner on current `main`. Therefore this checkpoint assigns **P1-224**.

## Validation state

Documentation only. Historical 88/88 JavaScript syntax and 74/74 deterministic tests were not rerun for this HEAD. Real unpacked Chrome QA remains required.

## Retired source: `RESEARCH_DELTA_FROZEN_PRINT_CONTENT_GENERATION_2026-08-28.md`

SHA-256 of UTF-8 source text: `a35803278fb13935733e2b994a31d095d217573eedc19ae17873f9a83bb31ef0`

# Research delta — frozen print content generation — 2026-08-28

Source-of-truth `main` immediately before this write: `bc2756e5cca6ef1c4572e671538b6ddd71e52b02`.

Docs-only research checkpoint. Runtime/config/manifest/tests are unchanged.

## Classification

No new P-number is assigned.

Fresh source proof strengthens **P0-075** (host-page/content-script DOM trust boundary) and **P0-004** (selected PDF correctness). It composes with **P0-071** (print-time URI TOCTOU), **P0-067/P0-068** (host/flattened representation side effects) and cross-origin **P1-199/P1-200/P1-203**.

The existing hostile-marker research already proves that page-visible Include/Exclude attributes cannot be print authority. This pass adds a broader invariant: **even perfect marker fencing is insufficient while Chromium ultimately prints the original mutable page-owned selected subtree.**

## Fresh source proof

### 1. Save authorization snapshots metadata, not page contents

`downloadPdf()` and the Yandex save path first construct `meta` using `buildSaveMeta()`. The metadata includes a serialized selection snapshot made from WebClip's isolated-world Maps.

The content script then sets `state.phase = 'printing'` and calls `await prepareForPrint(meta)` before asking the worker to generate the PDF.

The selected nodes themselves are still ordinary live page DOM nodes. No immutable printable subtree/content generation is captured at this user-authorizing transition.

### 2. Preparation deliberately contains asynchronous windows

`prepareForPrint(meta)` performs multiple async operations before the worker reaches Chromium PDF capture. Current source includes:

- remote frame synchronization;
- selected-resource prefetch with a bounded deadline;
- cross-origin remote-frame `prepare-print` calls;
- frame/layout preparation and print-style installation.

For cross-origin frames, `frame-agent.js::preparePrint()` explicitly sets `state.phase='printing'`, then awaits `prefetchSelected()` before installing its print stylesheet.

These waits are necessary/valuable for print quality and bounded resource behavior, but they create a deterministic interval between user authorization and actual render.

### 3. Element identity does not freeze element contents

WebClip's authoritative `state.includes` / `state.excludes` Maps hold Element references. A hostile page cannot directly insert a new isolated-world reference into those Maps, which is a useful defense.

However the same Element object can be changed by the page after the user saw/confirmed it:

- replace text descendants;
- add/remove child nodes;
- change `href/src/srcset/style` and CSS classes;
- replace an image or link target;
- move the selected node within another ancestor/layout context;
- alter page stylesheet rules affecting the selected subtree.

The Element reference remains the same Map member. A selection-generation check that proves only `Element A` is therefore not proof that the bytes/visual/link content printed for A are the content that existed when the user authorized saving.

### 4. Current print path renders live DOM at the end

After `prepareForPrint(meta)` returns, content sends `WEBCLIP_GENERATE_PDF` to the service worker. Chromium `Page.printToPDF` then renders the page using the live print representation.

`beforeprint` handling itself performs fresh selected-frame measurements and diagnostics immediately around print rendering. This confirms that layout/content are intentionally observed from the current live document at render time rather than an earlier immutable snapshot.

Consequently a page mutation that occurs after the user's Proceed but before/during print can become part of the produced PDF even though the serialized selection snapshot still describes the earlier selection generation.

### 5. Marker hardening alone cannot close this TOCTOU

Suppose a future patch makes Include/Exclude markers display-only and re-derives allowed node identities solely from isolated-world Maps. A hostile page can still mutate **inside** an allowed selected element.

Example:

1. user selects article element A whose text is benign version V1;
2. user explicitly clicks Download/Yandex Proceed;
3. metadata snapshots selection identity A;
4. `prepareForPrint()` waits on resources/remote frames;
5. page script replaces A's descendants with sensitive/misleading V2 while A itself remains the same Element;
6. print CSS still correctly admits only A;
7. Chromium prints V2;
8. Journal selection metadata/replay semantics represent the user's earlier selection, but the physical PDF contains content changed after authorization.

No forged marker is required.

### 6. Cross-origin selected frames have the same source-content mutability

`frame-agent.js` similarly stores selected child Elements in isolated-world Maps, but `preparePrint()` ultimately applies print CSS to that hostile child document. The child page owns the descendants and styles inside the selected Element throughout the prefetch/render interval.

Therefore exact frame-agent command generation (P1-199/P1-200/P1-203) is necessary but not enough to freeze what the user approved.

## Required acceptance

### One admitted printable-content generation

At user authorization, or at a clearly defined subsequent confirmation boundary before irreversible save begins, WebClip needs an immutable/frozen printable representation generation that binds:

- exact selected/excluded structure;
- actual printable text/content descendants;
- safe link/image/resource representation required by P0-071;
- exact remote-frame representation/generation;
- metadata/selection snapshot stored in Journal;
- resulting PDF bytes/content receipt.

The Journal snapshot and physical PDF must derive from the same accepted generation.

### Source page becomes input, not authority

After frozen representation admission:

- page mutations can affect the live site but not the print tree being rendered;
- no live page marker, href/src, subtree child, stylesheet mutation or beforeprint handler can expand/change privileged output;
- any representation that requires late materialization must prove it still belongs to the same source/document/selection generation or fail closed/restart confirmation.

### Frozen does not mean active clone

The representation must also satisfy existing P0-067/P0-068 requirements. A naive live DOM clone connected to the page is not acceptable if it can execute custom elements, create nested browsing/plugin contexts, duplicate network requests, or inherit hostile host behavior.

Use an inert/bounded representation or an equivalent isolation mechanism.

### Bounded resource handling remains

Resource prefetch/decode deadlines remain useful. If a resource is unavailable by the frozen-generation deadline, record a bounded failure/placeholder policy rather than falling back to whatever later live page mutation happens to provide.

## Deterministic regressions

1. User confirms selected A/V1; page replaces A text descendants with V2 during prefetch -> PDF contains admitted V1 (or operation explicitly re-confirms/fails), never silently V2.
2. Page changes selected link `href` after confirmation/beforeprint -> printed clickable URI remains the admitted safe value required by P0-071.
3. Page changes selected image `src/srcset` during preparation -> PDF representation does not switch to an unadmitted resource.
4. Page inserts sensitive child S inside an otherwise legitimately selected A after confirmation -> S is absent from frozen output.
5. Page removes a user-excluded child after confirmation and inserts a replacement at the same position -> exclusion/output semantics remain generation-defined, not DOM-position guessed.
6. Page moves selected Element A under a different hostile layout/ancestor after confirmation -> frozen print structure is unchanged.
7. Host stylesheet mutation after confirmation cannot reveal extra content or materially rewrite frozen representation.
8. Cross-origin child mutates selected subtree while `prefetchSelected()` is awaiting decode -> top PDF uses one admitted remote-frame print generation.
9. Remote frame reload/replacement after confirmation -> old generation cannot silently print the new document.
10. Journal `selectionSnapshot`/metadata and resulting PDF content receipt identify the same generation.
11. Frozen representation remains inert: no custom-element callback, iframe/plugin activation or uncontrolled duplicate network request introduced by the fix.
12. Resource deadline/failure remains bounded and does not reopen the live-page authority window.

## Numbering result

No new item is created. Primary ownership remains **P0-075 + P0-004**, with P0-071/P0-067/P0-068 and P1-199/P1-200/P1-203 as required composition layers.

## Test / release state

No product tests were rerun. Historical gate remains **88/88 JavaScript syntax + 74/74 deterministic tests PASS** as prior evidence only. No build, tag or Release was created.

## Retired source: `RESEARCH_DELTA_FROZEN_PRINT_REPRESENTATION_SHARED_DOM_MARKERS_2026-08-28.md`

SHA-256 of UTF-8 source text: `ebf19f9ec3c89d206fcf27ffd98a7fbfc49d0064137cd660ec70b72194f6080c`

# Research delta — frozen print representation vs shared-DOM marker mutation — 2026-08-28

Source-of-truth `main` before this checkpoint: `d78ce2b39b947268de64bc69becc6fd7a98f64a9`.

Docs-only research checkpoint. Runtime/config/tests/manifest are unchanged.

## Classification

No new P-number is assigned.

Fresh source proof refines **P0-075** and composes with **P0-004**, **P0-070**, **P0-071**, **P1-199/P1-200** and frame/document-generation requirements.

The core result is stronger than the already recorded synthetic-click issue: **the final PDF selection boundary is encoded in page-visible shared DOM attributes, so a hostile/cooperative page can change the print result after the user has authorized a selection without generating a WebClip click at all.**

## Two different selection representations exist

Current `content.js` keeps selected elements in isolated-world state:

- `state.includes: Map`;
- `state.excludes: Map`.

At the same time `addInclude()` and related functions write shared DOM attributes:

- `data-webclip-pdf-include`;
- `data-webclip-pdf-exclude`.

Those attributes live on ordinary page DOM nodes. Chrome isolated worlds isolate JavaScript globals, not the DOM tree itself. Page JavaScript can observe, remove, move or synthesize those attributes.

## Final selected-only print CSS trusts the shared attributes

The print stylesheet emitted by current code hides elements using selectors equivalent to:

`body *:not(...):not([data-webclip-pdf-include]):not([data-webclip-pdf-include] *):not(:has([data-webclip-pdf-include])) ... { display:none }`

and excludes with:

`[data-webclip-pdf-exclude], [data-webclip-pdf-exclude] * { display:none }`.

Therefore the final Chromium print tree is selected by DOM marker presence, not by an immutable copy of the isolated-world `state.includes/state.excludes` authorization set.

This is a correctness/security capability boundary, not merely visual decoration.

## Deterministic marker-injection schedule

1. User explicitly selects element A.
2. WebClip stores A in `state.includes` and writes include marker to A.
3. User opens review/save and authorizes PDF generation.
4. Before Chromium captures the final print layout, page JavaScript creates or chooses element B that the user never selected.
5. Page JavaScript sets `data-webclip-pdf-include` on B.
6. The selected-only print CSS sees B as an include root.
7. B and its descendants can appear in the PDF despite never being present in WebClip's authorized include map.

No synthetic click or runtime message is required.

The symmetric schedule exists for omission:

- page removes include marker from A;
- page adds exclude marker inside A;
- the PDF omits user-authorized content or changes its shape.

## Attribute values do not protect the capability

The marker value is currently an incrementing id, but the CSS checks marker presence rather than validating that the value corresponds to a live isolated-world map entry.

Even if a future patch compared ids immediately before preparation, page mutation can still occur after that check and before/during print unless the final representation is frozen or isolated from page writes.

A random unguessable attribute value is not a robust fix either: page code can enumerate attributes/nodes and copy the value from a legitimate selected element.

## `prepareForPrint()` creates a real asynchronous mutation window

PDF generation is not one synchronous DOM operation.

Current flow includes asynchronous work such as:

- remote frame synchronization/preparation;
- resource prefetch/loading;
- disclosure/layout normalization;
- print style/resource preparation;
- runtime message to worker;
- debugger/CDP setup before `Page.printToPDF`.

Thus there is a material period after the user clicked the final action during which ordinary page timers, mutation observers, network callbacks and framework renders can run.

The page does not need to win a sub-millisecond race.

## `beforeprint` does not establish a trusted snapshot

Current `beforeprint` handler remeasures selected frames/captures diagnostics and hides WebClip UI. It does not construct a new page-inaccessible immutable representation of the authorized content.

`Page.printToPDF` therefore still renders the live document after shared-DOM markers have remained mutable throughout preparation.

Diagnostics can detect some structural changes after the fact but are not authorization and cannot guarantee the emitted PDF matched what the user selected.

## MutationObserver repair alone is insufficient

One possible patch might watch include/exclude attributes and immediately restore expected values from `state.includes/state.excludes`.

That improves accidental-page compatibility but is not a security/correctness fence:

- observer delivery is asynchronous;
- page and extension can race immediately before render;
- page can replace the entire selected node, ancestor or subtree;
- page can mutate text/images/links inside an otherwise correctly marked selected node;
- page can modify CSS/layout affecting what Chromium prints.

The required invariant is broader than marker integrity: **the bytes/render tree authorized for this PDF generation need a WebClip-owned frozen generation.**

## Required P0-075/P0-004 architecture

Before irreversible PDF generation admission, create a frozen print representation bound to the current selection/document generation.

Acceptable implementation families include:

### WebClip-owned detached clone/document

Create a sanitized/normalized clone of exactly the authorized include-minus-exclude content under extension-owned control, preserving the accepted link/image/layout semantics required by P0-004.

The live page must not be able to add/remove authorized content after the clone generation is sealed.

### Isolated renderer/offscreen representation

Serialize the selected representation into a bounded extension-owned payload and render it in an extension-owned/offscreen print document.

This requires careful resource/base-URL/font/image semantics and must not silently weaken the existing renderer-origin privacy model.

### Exact frozen DOM generation with proof

If Chromium/page DOM must remain the render surface, WebClip needs an equivalent mechanism proving the exact rendered tree belongs to the authorized generation and preventing page mutation during the critical region. Merely setting attributes in the shared live DOM is not equivalent.

The design must be compatible with hostile-page assumptions rather than depending on cooperative script suspension.

## Frozen representation receipt

The generation should bind at least:

- exact top `documentId` / navigation generation;
- include/exclude selection generation;
- remote-frame permission/document/selection generation;
- normalized file comment/header metadata generation where relevant;
- resource-preparation report/generation;
- immutable print representation id/digest or equivalent receipt;
- operation receipt used by `WEBCLIP_GENERATE_PDF`;
- cleanup/restore generation for temporary page mutations.

Worker/CDP generation must consume this exact receipt. A stale representation from document A cannot be printed after same-URL document B replacement.

## Page content mutation vs user intent

Freezing selection does not mean every dynamic page must be captured at click-time forever.

The product needs an explicit snapshot boundary. A reasonable policy is:

1. user confirms save;
2. WebClip resolves current selected nodes and performs accepted bounded resource/disclosure normalization;
3. WebClip seals generation F;
4. only F is eligible for PDF rendering;
5. later live-page mutations affect a future operation, not F.

Whatever boundary is chosen must be deterministic and testable.

## Cross-origin frame composition

Remote frame content has the same issue at another boundary.

A remote child that prepares print state must produce a print-generation receipt tied to its exact child document and permission/session generation. Top PDF generation cannot merely trust page-visible iframe attributes or stale remote snapshot counts.

P1-199/P1-200/P1-201/P1-171 remain the owners of remote print/selection/permission/document generations; the frozen top representation consumes their proven outputs.

## Restore/cleanup remains separate

A frozen representation does not eliminate rollback requirements for temporary mutations on the live page.

`restoreAfterPrint()` and remote `restore-print` must remain generation-aware so late cleanup A cannot roll back a newer selection/print generation B.

But cleanup correctness is different from representation authority: even perfect rollback cannot make a live mutable shared-marker print safe.

## Required deterministic/browser regressions

1. User selects A; page sets include marker on unselected B before `Page.printToPDF` -> B is not in PDF.
2. Page copies the exact include attribute value from A to B -> B remains unauthorized.
3. Page removes A's include attribute after save click -> frozen F still includes A.
4. Page inserts exclude marker into A after save click -> frozen F is unchanged.
5. Page replaces selected DOM node with a same-looking/new node after F seals -> current operation renders F, not replacement.
6. Page mutation before the defined seal boundary is either intentionally incorporated or causes a clear stale/re-resolve result according to policy.
7. Same-URL full-document reload after F creation -> old F cannot be consumed by new document operation without explicit detached-snapshot product semantics.
8. Hostile page mutation observer continuously rewrites marker attrs -> PDF remains bound to F and operation stays bounded.
9. Normal dynamic page/resource preparation still produces expected P0-004 PDF semantics.
10. Cross-origin selected frame changes/reloads during freeze -> exact child generation fails closed or produces its own new proven frozen generation.
11. Print cleanup failure cannot mutate the already produced F receipt or make a later operation reuse it.
12. Page-visible WebClip markers may remain for UX/outlines, but changing them is no longer sufficient to change final print authority.

## Duplicate check / numbering

No new item is created.

- **P0-075** owns hostile-page control-plane/selection trust and now explicitly includes shared-DOM print marker capability.
- **P0-004** owns fidelity of the accepted selected representation in the resulting PDF.
- **P0-070/P0-071** remain PDF/document operation and cleanup generation dependencies already established by prior research.
- **P1-199/P1-200/P1-171/P1-201** remain remote frame print/selection/document/permission generation owners.

P1-211 remains unassigned.

## Test / release state

Docs-only research checkpoint. Product tests were not rerun. Historical **88/88 JavaScript syntax + 74/74 deterministic tests PASS** remains prior evidence only. Real hostile-page/unpacked-Chrome print QA remains required. No build, tag or Release was created.

## Retired source: `RESEARCH_DELTA_HOSTILE_SELECTION_MARKER_CAPABILITY_2026-08-28.md`

SHA-256 of UTF-8 source text: `186035d90ef387aada1db5409059cb71fe9f0c759c1d9d14b6ac6e46c34ff950`

# Research delta — hostile selection marker / synthetic WebClip UI capability — 2026-08-28

Source-of-truth `main` immediately before this write: `c939c7fe267ab6265c5eecb5b88fc7a27a7a3403`.

Docs-only research checkpoint. Production runtime, tests, configuration and `manifest.json` are unchanged. No new P-number is assigned.

## Classification

Fresh hostile-page research materially strengthens existing **P0-075 — host-page/content-script DOM trust boundary**.

The current canonical item already records:

- predictable open Shadow DOM exposes WebClip user input/state;
- Include/Exclude marker attributes are page-visible;
- ordinary selection/UI listeners do not require `Event.isTrusted`;
- hostile page code can synthetic-click selection or extension UI and potentially trigger save/upload workflows.

This pass proves a stronger output-integrity consequence: **page-visible marker attributes are not merely disclosure/visualization state; they are direct capabilities controlling the actual selected-only print CSS.** A hostile page can therefore make the produced PDF include content not present in WebClip's authoritative in-memory selection snapshot, or remove intended exclusions, without needing to mutate the Maps that are later stored in Journal metadata.

Adjacent owners remain:

- **P0-004** — selected PDF output correctness;
- **P0-071** — safe link/URI invariant on the actual printable representation and hostile pre-print TOCTOU;
- **P0-067/P0-068** — host-page execution and iframe flattening side effects during print preparation;
- **P1-199/P1-200/P1-203/P1-201** — cross-origin frame print/control/worker/permission generations;
- **P1-210/P1-198/P0-079** — retry/result/operation/PDF generation after a save is authorized.

No new P0/P1 number is needed because the trust failure remains exactly P0-075: hostile page-owned DOM/events are being treated as WebClip-owned authorization/output state.

## Top-document selection has two different representations

Current top content keeps authoritative selection objects in isolated-world memory:

- `state.includes: Map`;
- `state.excludes: Map`.

When a user selects an element, WebClip also writes ordinary DOM attributes onto that page-owned node:

- `data-webclip-pdf-include`;
- `data-webclip-pdf-exclude`.

Those attributes are shared DOM state and therefore observable/mutable by page JavaScript.

This dual representation would be safe only if the DOM markers were derived visual hints and every privileged/output operation re-derived its truth from the Maps. Current print CSS does not do that.

## Journal/selection metadata is built from the Maps

`serializeSelectionSnapshot()` constructs the local selection snapshot from:

`[...state.includes.values()].map(createElementLocator)`

and:

`[...state.excludes.values()].map(createElementLocator)`.

Remote frame snapshots are then appended from the worker/top `remoteFrames` state.

Therefore Journal metadata/restore provenance describes the elements held in WebClip's in-memory Maps/snapshots, not arbitrary DOM nodes that merely carry a marker attribute.

This is a useful positive control: hostile code cannot directly insert an arbitrary Element reference into the isolated-world Map merely by setting an attribute.

## Actual top-document print scope is controlled by page-visible attributes

The print stylesheet, however, uses live DOM selectors equivalent to:

- hide every body descendant that is not the print header, not `[data-webclip-pdf-include]`, not inside an include, not an ancestor containing an include, and not one of the frame-print proxy markers;
- hide `[data-webclip-pdf-exclude]` and descendants.

Thus the browser's print representation derives its selected-only visibility from **current shared DOM attributes at render time**, not directly from the Map identity set.

### Forged Include capability

A hostile page can execute, after the user has made an ordinary selection:

1. choose arbitrary page node S that the user did not Include;
2. set `data-webclip-pdf-include` on S;
3. allow WebClip to continue to PDF generation.

The print stylesheet now treats S as selected even though `state.includes` and the serialized Journal snapshot do not contain S.

This is not a visual-outline spoof only. S is eligible to become physically present in the PDF selected-output representation.

Potential consequences include:

- extra sensitive page content included without the user's selection;
- a Journal entry whose saved selection snapshot says A while the PDF contains A + hostile S;
- future restore of the Journal snapshot does not reproduce what the original PDF actually contained;
- print diagnostics based on Maps can disagree with the rendered result.

### Forged ancestor capability

Because the CSS intentionally keeps ancestors satisfying `:has([INCLUDE_ATTR])`, inserting a forged include marker can also keep an otherwise hidden ancestor chain alive. Depending on page CSS/layout, this can expose additional context around the forged node beyond the exact marker element.

The invariant must therefore be expressed over the **actual frozen printable tree**, not only a final count of marker attributes.

## Removing an Exclude can reintroduce content the user explicitly removed

The symmetric attack is even simpler:

1. user Includes article A;
2. user Excludes child X;
3. isolated-world `state.excludes` still contains X and the Journal snapshot records it;
4. hostile page removes `data-webclip-pdf-exclude` from X before/during print;
5. live CSS no longer hides X;
6. PDF contains content the user explicitly excluded, while the Journal metadata still claims X was excluded.

A page can also move/replace selected nodes while preserving or changing markers. Element-reference Maps and CSS attributes then diverge further.

This makes the P0-075 requirement stronger than `protect the UI from synthetic clicks`: **the printable representation itself must not accept page-authored marker state as authority.**

## One-time marker cleanup immediately before print is insufficient

A tempting patch would be:

1. scan all marker attributes;
2. remove unknown markers;
3. restore expected attributes from the Maps;
4. call `Page.printToPDF`.

That still leaves a hostile mutation window. The page owns its DOM and can use:

- MutationObserver;
- timers/microtasks;
- `beforeprint` handlers;
- page lifecycle callbacks triggered during preparation;

to add/remove markers after the one-time reconciliation but before Chromium commits the actual print rendering.

P0-071 already proves the analogous href sanitization TOCTOU. Selection markers have the same architectural lesson: one-time cleanup on a live hostile document is not an enforceable output boundary.

## Cross-origin frame-agent has the same marker-as-capability problem

`frame-agent.js` keeps isolated-world Maps:

- `state.includes`;
- `state.excludes`.

It writes ordinary child-page DOM attributes:

- `data-webclip-remote-include`;
- `data-webclip-remote-exclude`.

Its `snapshot()` is built from the Maps, while `preparePrint()` installs a live child-document print stylesheet whose inclusion/exclusion selectors are driven by those attributes.

The cross-origin page owns exactly that DOM. It can therefore:

- set a fake remote Include marker on an unselected child node;
- remove an Exclude marker;
- mutate markers while `preparePrint()` is awaiting resource prefetch;
- mutate them after print style mount but before top-level Chromium print render.

Top content cannot inspect the child DOM due to SOP and therefore cannot independently compare the actual print marker set with the child snapshot before printing.

This fresh proof composes P0-075 with P1-199/P1-200/P1-203: exact command/print generations are necessary but do not make hostile child DOM marker authority safe.

## Synthetic page click still mutates selection without trusted-input proof

Top `onPageClick(event)` checks WebClip internal UI exclusion and current phase, but there is no `event.isTrusted` requirement.

When selecting it:

- prevents default/propagation;
- derives the candidate from `event.target`;
- calls Include/Exclude mutation according to `state.selectionMode`.

A hostile page can dispatch a synthetic click to a usable element during selection and thereby mutate WebClip's actual in-memory selection Map, not just its DOM markers.

`frame-agent.js::click(ev)` has the same property in a granted cross-origin child.

This part was already in P0-075; current source reconfirms it remains unfixed.

## Open Shadow DOM exposes the complete WebClip control surface to page code

`ensureUi()` creates predictable `#webclip-pdf-extension-root` and calls:

`host.attachShadow({ mode:'open' })`.

The page can therefore find the host and traverse `host.shadowRoot` to WebClip controls.

Static toolbar handlers such as:

- auto-content;
- suggest ads;
- Journal/current-site Journal;
- include/exclude mode;
- clear;
- cancel;
- finish;

accept any DOM click event and do not require `event.isTrusted`.

This is already significant because synthetic Finish transitions the state to review and opens the save UI.

## Dynamic modal buttons make synthetic side effects explicit

All dynamic modal controls are created by `createUiButton(text, primary, onClick)`.

That helper registers:

`button.addEventListener('click', event => { event.stopPropagation(); onClick(event); })`

with no trusted-input/capability check.

Fresh caller review proves the same helper creates controls that start real side-effecting workflows, including:

- `Скачать PDF`;
- `Отправить на Яндекс Диск`;
- the final Proceed button in the file-comment dialog, which reads `textarea.value` and calls `downloadPdf(...)` or `sendPdfToYandex(...)`;
- `Повторить` after a local PDF error;
- `Повторить отправку на Яндекс Диск` for cached PDF retry;
- other operation-specific action buttons.

Because the shadow root is open, hostile page code can obtain these button nodes and invoke `.click()`/dispatch an event.

The transition from hostile page synthetic event to privileged runtime save is therefore concrete:

`page script -> open shadow button synthetic click -> content isolated-world callback -> downloadPdf/sendPdfToYandex/retryCachedPdfToYandex -> privileged runtime operation`.

The runtime sender ACL remains intact — the privileged worker request genuinely comes from WebClip content code. The missing authorization is **user intent inside the content UI**, which is why this belongs to P0-075 rather than P0-020.

## Hostile page can also mutate the file comment before synthetic Proceed

The file-comment textarea is ordinary DOM inside the open shadow root. The Proceed callback reads:

`textarea.value.trim()`

at click time and includes it in save options.

Thus hostile page code can both:

- read user-entered comment text, as already documented;
- replace/inject the textarea value and synthetic-click Proceed, causing page-authored text to enter PDF header/Journal/OperationLog-related save metadata as though accepted by the user.

This is an integrity consequence in addition to confidentiality.

## Retry controls compose with P1-210/P1-198

A hostile page should not gain authority simply because WebClip is in an error/unknown-result state.

Current dynamic retry buttons can be synthetic-clicked. After outer transport loss or ambiguous physical settlement, this can combine:

- P0-075: hostile page can activate the retry control;
- P1-210: UI may not know whether prior side effect settled;
- P1-198/P0-079/P0-039/P1-184: exact operation/PDF/download/remote receipt needed to decide whether retry is allowed.

Fixing P1-210 while leaving P0-075 open would still allow page script to press a genuinely enabled explicit-retry button. Therefore the final retry action itself must be WebClip/user-authorized, not merely DOM-clickable.

## Escape / keyboard control is also synthetic but currently lower authority

Top `onKeyDown` reacts to Escape without checking `event.isTrusted`; frame-agent `key(ev)` similarly turns a child session idle on Escape.

Synthetic Escape can therefore cancel/alter WebClip UI/session state.

This is a real control-plane integrity issue but, in current source, Escape itself does not directly authorize PDF/Yandex side effects. Keep it under the same trusted-input regression matrix rather than creating a separate priority item.

## Required P0-075 architecture refinement

### 1. Page DOM must not be the authoritative print selection capability

The actual selected-only print representation must derive from WebClip-owned selection identities/generation, not arbitrary live page attributes.

Preferred direction remains a bounded inert/frozen print representation:

- copy only the exact WebClip-selected node set/required ancestor structure into WebClip-owned printable representation;
- apply exclusion there from WebClip-owned state;
- freeze/neutralize active host semantics according to P0-067/P0-068/P0-071;
- hostile changes to the source page after snapshot admission do not alter the representation that `Page.printToPDF` renders.

If another architecture is chosen, it must provide an equivalent enforceable invariant across the entire render window. A predictable attribute/class on the hostile live DOM cannot serve as unforgeable authority.

### 2. Page-visible markers become display-only and bounded-lifetime

If DOM attributes remain for screen outlines/debugging:

- they are never consumed as privilege/output authority;
- remove them as soon as selection interaction no longer needs them;
- use minimal value/timing disclosure;
- page mutation/removal of a marker can at most alter a decorative overlay, not PDF contents or durable selection metadata.

### 3. User-authorizing content UI needs a trusted activation gate

Actions that can start/change a privileged workflow require a WebClip-controlled user-activation receipt, including at least:

- Finish when it exposes save authorization UI;
- Download/Yandex Proceed;
- cached retry/retry-after-error;
- any future destructive/upload/publish operation exposed inside the content UI.

A raw DOM `click` event from an open/page-accessible shadow root is not sufficient.

`Event.isTrusted` is a necessary browser signal for direct click authorization, but the architecture should also ensure the event belongs to the current exact WebClip UI/session generation. A trusted old click/late handler must not authorize a newer modal/operation generation.

### 4. Sensitive input should not live in page-readable DOM

The comment value should move to an extension-owned surface/context or an equivalent privacy boundary that host page script cannot inspect or modify.

A closed shadow root alone is not a complete security model for all event/data flows; the important invariant is that hostile page script cannot acquire/read/write the authoritative input/control state used for privileged operations.

### 5. Cross-origin frame agents need the same hostile-DOM rule

Granting optional host permission authorizes WebClip to access/control a frame; it does not make the frame page trusted.

Remote selection/print must retain isolated-world Map/session authority and must not let child-page DOM attributes synthetic events become current selection/output capability.

P1-201 permission revocation and P1-199/P1-200 generation fences compose but do not replace this trust rule.

## Required deterministic / hostile-browser regressions

1. User selects only A; page sets `data-webclip-pdf-include` on unselected sensitive S immediately before print -> S is absent from PDF and absent from authoritative print representation.
2. User excludes X; page removes `data-webclip-pdf-exclude` in MutationObserver/beforeprint -> X remains excluded from PDF.
3. Page moves marker from selected A to unrelated B -> PDF remains tied to admitted selection identity, not marker location.
4. Page injects many fake Include attrs after one-time pre-print cleanup -> no additional printable content appears.
5. Journal selection snapshot and actual PDF selected content are generated from the same admitted selection generation and cannot diverge through marker mutation.
6. Cross-origin child adds fake `data-webclip-remote-include` after `prepare-print` starts -> fake child content is absent from PDF.
7. Cross-origin child removes remote Exclude marker before top print -> excluded content remains excluded.
8. Page dispatches synthetic click on an article during selection -> WebClip authoritative includes/excludes do not change.
9. Page obtains open-shadow Finish and calls `.click()` -> no user-authorizing transition occurs.
10. Page synthetic-clicks `Скачать PDF` or Yandex Proceed -> no privileged PDF/download/upload operation begins.
11. Page changes comment textarea value then synthetic-clicks Proceed -> page-authored value does not enter Journal/PDF as user comment.
12. Page synthetic-clicks local `Повторить` after unknown/failed save -> no new physical operation starts.
13. Page synthetic-clicks `Повторить отправку на Яндекс Диск` -> no remote retry starts without current explicit WebClip/user authorization receipt.
14. Real trusted user clicks continue to work normally and are tied to current UI/session generation.
15. Synthetic Escape cannot create an inconsistent print/session state; trusted Escape cancellation remains available.
16. Host page removing all visual marker attributes may affect only decorative selection visualization, not internal selection/snapshot/print authority.
17. P0-071 hostile `beforeprint` href mutation remains independently blocked on the same frozen representation.
18. P0-067 host disclosure controls are not executed to construct the frozen representation.
19. P0-068 iframe clones remain inert/no active custom-element or network capability.
20. Real unpacked Chrome tests execute hostile MAIN-world scripts against the isolated-world content script to prove DOM/event boundary behavior, rather than relying only on same-JS-realm unit mocks.

## Duplicate check / numbering

No new P-number is assigned.

- **P0-075** owns hostile DOM/event/marker/UI authority.
- **P0-004** remains product correctness for selected PDF output.
- **P0-071** remains URI safety/print TOCTOU.
- **P0-067/P0-068** remain host execution/inert representation boundaries.
- **P1-199/P1-200/P1-203/P1-201** remain cross-origin print/control/worker/permission generations.
- **P1-210/P1-198/P0-079** remain result/operation/body receipt owners after legitimate save admission.

P1-211 remains unassigned by this block.

## Test / release state

No runtime/config/manifest changes were made. Product tests were not rerun. The last proven product gate remains historical **88/88 JavaScript syntax + 74/74 deterministic tests PASS**. No build, tag or GitHub Release was created.

## Retired source: `RESEARCH_DELTA_HOST_CONTROL_PRINT_2026-08-27.md`

SHA-256 of UTF-8 source text: `9809b5a113acc57fc0fb20e11b09b7500cf9c4968b7fbd34a84ce1b7192c51a1`

# Host-page control plane / print URI research delta — 2026-08-27

Baseline source HEAD: `19b2e18759b3e44a5001375006f67b5228e2fade`.

This checkpoint records fresh evidence against existing P0-075/P0-071. It is not a canonical registry replacement and assigns no new P-number. Production/runtime/config/manifest are unchanged by this commit.

## Existing P0-075 refinement — open shadow exposes both sensitive input and user-authorizing controls

Fresh `content.js` review reconfirms the P0-075 trust-boundary issue as a single control-plane problem, not merely a styling concern.

Evidence:

- WebClip creates `#webclip-pdf-extension-root` inside the host page and calls `host.attachShadow({ mode: 'open' })`.
- The save comment is an ordinary `<textarea>` inside that open shadow root. Host-page JavaScript can resolve the predictable host, access `host.shadowRoot`, and read the current value while the user types.
- `createUiButton()` attaches `click` handlers that call the privileged WebClip callback after only `event.stopPropagation()`; there is no `event.isTrusted` admission check.
- Consequently hostile page JavaScript that reaches the open shadow root can invoke `.click()` on WebClip controls, including save/upload flow controls, without a real user click on that button.
- The page-level `onPageClick(event)` selection handler likewise has no `event.isTrusted` check. Synthetic page clicks while selection mode is active can therefore participate in Include/Exclude mutation.
- Include/Exclude state is stored in extension-side Maps, but selected host nodes are also marked with predictable `data-webclip-pdf-include` / `data-webclip-pdf-exclude` attributes. Host JavaScript can observe exact selection/timing and mutate/remove those attributes; print CSS/marking paths still rely on page-visible markers in addition to the Maps.
- The file comment is later copied into a print header element inserted directly into `document.body`; a host MutationObserver can observe/read it during the print preparation lifetime even if the toolbar shadow itself were changed to `closed`.

Required P0-075 architecture:

- Sensitive user text must not live in host-page-readable DOM. A closed shadow alone is not sufficient because the print header currently re-exposes the value in ordinary page DOM.
- User-authorizing controls that can start save/upload/destructive selection transitions must require a trusted user-input/extension-owned authorization state; synthetic host `.click()` must not be equivalent to user consent.
- Authoritative selection should not depend on long-lived page-visible attributes. If print markers are unavoidable, derive them from extension-held state immediately before an inert/frozen print representation and remove them on exact rollback.
- Host removal/mutation of visual markers must not change the logical set silently or cause different content to be printed than the extension-side state describes.
- Cross-origin frame-agent markers require the same principle, coordinated with P1-171/P1-004 document generation.

Required hostile-page regressions:

1. Page script reads predictable host/shadow while comment is entered: plaintext comment is not observable in the fixed design.
2. Page calls `.click()` on WebClip save/upload button: no privileged operation starts without trusted authorization.
3. Page dispatches synthetic click on host content during selecting: selection does not mutate as if a user clicked.
4. Page observes `document.body` during print preparation: private comment is not exposed in ordinary host DOM.
5. Page removes/changes selection marker attrs after selection: authoritative selection/print either remains exact or fails closed; no silent substitution.

No new P0 number is assigned because all of these are the same host-DOM attacker/control-plane root cause already explicitly owned by P0-075.

## Existing P0-071 reconfirmation — current link rewrite does not enforce safe schemes

Fresh review reconfirms the current printable-link implementation:

- `absolutizeLinksInIncludedContent()` collects included `a[href], area[href]`, remembers the original attribute and writes `href = link.href` without a scheme allowlist.
- `wrapUnlinkedImagesForPdf()` creates a new `<a>` and assigns `link.href = imageUrl` for image URLs accepted by its current source test, which includes `file:`, `data:` and `blob:` in addition to HTTP(S).
- These rewrites happen during live print preparation before Chromium `Page.printToPDF`; they do not create the inert/frozen safe-link representation required by P0-071.
- `beforeprint` remains page-observable/page-controllable, so even a one-time pre-print sanitizer on the live document would not by itself close the TOCTOU already documented in P0-071.

Required P0-071 direction remains:

- explicit durable clickable-scheme allowlist on the exact representation passed to print;
- non-allowed schemes become non-clickable text/image, not merely absolute URLs;
- safe link state must be immutable/frozen against host `beforeprint`/MutationObserver changes between sanitizer and print render;
- P0-066 canonical URL confidentiality still applies separately to URL text that is displayed/durable.

No new number is assigned.

## Number allocation

**P0-079, P1-197 and P2-020 remain unassigned.** P1-195/P1-196 remain evidence-reserved in the OAuth checkpoint.

## Test / release evidence

Research documentation only. Product runtime/configuration and `manifest.json` are unchanged. Product tests were not rerun; the earlier `88/88 syntax + 74/74 deterministic PASS` remains historical evidence only.

## Retired source: `RESEARCH_DELTA_LINK_NORMALIZATION_ROLLBACK_AUTHORITY_2026-08-29.md`

SHA-256 of UTF-8 source text: `64d023e7e59461ce4f91426c28eb9699dd2854e05962690ca1a4595e89c19f0e`

# Research delta — live link normalization rollback needs CAS and private receipt — 2026-08-29

Baseline `main` before this write: `48ced7fe74d1b15ed7104247621bd98ec65d6b4d`.

Docs-only research checkpoint. Runtime, tests, manifest, build, tag and Release are unchanged.

## Classification

**New P1-221 — PDF link normalization rollback trusts host-mutable rollback metadata and can overwrite a newer page-owned `href`.**

P0-071 owns safe URI semantics/TOCTOU in the actual printed representation. P1-221 is the separate post-preparation mutation-authority problem: restoring the live page after print.

## Source proof

Before print, `content.js` normalizes selected links by writing the original `href` into a DOM attribute and replacing `href` with the resolved absolute URL:

```js
const original = link.getAttribute('href');
link.setAttribute(ABS_HREF_ATTR, original);
link.setAttribute('href', link.href);
state.changedLinks.push(link);
```

At cleanup it does:

```js
const original = link.getAttribute(ABS_HREF_ATTR);
if (original != null) link.setAttribute('href', original);
link.removeAttribute(ABS_HREF_ATTR);
```

Two ownership facts are missing:

1. cleanup does not verify that current `href` still equals the exact temporary normalized value WebClip wrote;
2. the rollback source itself (`data-webclip-original-href`) is stored in page-visible/page-mutable DOM and is reread later instead of using an immutable WebClip-side receipt.

## Deterministic stale-write schedule

1. Link starts `href="item/1"`.
2. WebClip stores `item/1` in its marker and writes an absolute temporary href.
3. SPA/router updates the same live link to `href="item/2"` before cleanup.
4. WebClip cleanup rereads its marker and writes `href="item/1"`.
5. The newer application state is silently reverted.

A hostile or merely reactive page can also alter/remove the rollback marker. The page already owns its own links, so this is not a privilege escalation by itself; the correctness defect is that WebClip treats host-mutable state as an authoritative rollback receipt and performs a stale write after its temporary ownership was superseded.

## Required contract

Temporary link normalization must keep a WebClip-owned record containing at least:

- exact link object + accepted document/application/preparation generation;
- original `{present,value}`;
- exact temporary `{present,value}` written for print.

Cleanup must compare the current live value to the exact temporary value and restore only on equality. If the host changed `href`, cleanup leaves it unchanged and records bounded `rollback-superseded` diagnostics.

The original value used for rollback must not be obtained from a host-mutable data attribute. If a DOM marker is still needed for CSS/diagnostics, it is non-authoritative and cleanup must remove only the exact marker/value owned by the current generation.

The preferred P0-075 end state is to normalize URLs only in an inert/frozen printable representation, eliminating live-page href rollback altogether.

## Required regressions

1. `href` remains exactly WebClip temporary absolute value -> restore exact original relative href.
2. SPA changes `href` before cleanup -> newer href survives.
3. Page removes `href` before cleanup -> WebClip does not resurrect old href unless current state exactly matches its temporary receipt semantics.
4. Page changes/removes `ABS_HREF_ATTR` -> rollback authority is unaffected because the authoritative receipt is private WebClip state.
5. Old preparation cleanup cannot revert a link normalized by a newer preparation generation.
6. Detached/replaced link node does not cause mutation of a replacement node with similar selector/id.
7. P0-071 safe printable-link behavior remains intact.

## Duplicate check / numbering

Existing P0-071/P0-075 material covers URI safety and the broader frozen-print boundary, and the 2026-08-27 print-preparation research notes that link normalization mutates live DOM. Repository semantic search found no owner for the distinct cleanup rule: host-mutable rollback metadata + compare-before-restore of `href`.

Current repository search found no `P1-221`; P1-220 is the latest newly assigned owner on current `main`. Therefore this checkpoint assigns **P1-221**.

## Validation state

Documentation only. Historical 88/88 JavaScript syntax and 74/74 deterministic tests remain historical evidence and were not rerun for this HEAD.

## Retired source: `RESEARCH_DELTA_OFFSCREEN_MEMORY_LIFETIME_2026-08-27.md`

SHA-256 of UTF-8 source text: `f2191a65b64e976ba25503875fade36fc685eca0544fed9d7f54711477ec6ba5`

# Research delta — offscreen memory admission and Blob lifetime — 2026-08-27

Baseline HEAD before this research block: `b9f6d531bb9192b1eab2d64a67ea2e148e13288d`.

Docs-only research checkpoint. Production runtime and `manifest.json` are unchanged. Canonical registry synchronization is not claimed.

## Scope

Fresh review of offscreen resource admission and lifetime around existing `P0-063`, `P0-065`, `P1-054`, `P1-156`, `P1-169`, and dormant-capability item `P2-018`.

## P0-063 — signed transfer admission is structurally before materialization

Current offscreen signed-transfer handling reserves capacity synchronously when `WEBCLIP_SIGNED_TRANSFER` is admitted:

- max 2 actual signed transfers;
- max 96 MiB aggregate reservation;
- `pdf-cache-upload` reserves a conservative PDF upper bound;
- text/chunk upload reserves 64 MiB;
- text download reserves its bounded maximum.

Only after that reservation does `handleSignedTransfer()` read IDB/build the Blob/start fetch. Reservation is released in `.finally()` of the **actual offscreen transfer promise**, not a caller-side runtime deadline.

This is the correct shape required by P0-063. Preserve it when fixing the Blob-URL paths; do not regress signed transfer admission into a post-materialization accounting check.

## P0-065 / P1-054 — Blob URL budget is still too late

`registerBlobUrl(blob)` enforces the useful P1-054 cap (12 active URLs / 256 MiB active Blob bytes), but every creation path reaches it only **after** its large object exists:

### PDF cache Blob URL

`WEBCLIP_CREATE_PDF_CACHE_BLOB_URL`:

1. reads the full cache record;
2. converts/returns its PDF Blob via `cachedPdfRecordToBlob()`;
3. only then calls `registerBlobUrl(blob)`.

Legacy/base64 compatibility can therefore pay decode/materialization cost before discovering that aggregate Blob budget is already exhausted.

### Inline text Blob URL

`WEBCLIP_CREATE_TEXT_BLOB_URL`:

1. bounds `text.length` to 64 MiB UTF-16 code units;
2. creates `new Blob([text])`;
3. only then calls `registerBlobUrl(blob)`.

Character count is not the byte size of the resulting UTF-8 text Blob. A valid non-ASCII string can produce a substantially larger Blob than its code-unit count. If existing active Blob usage is already high, the new large Blob is fully materialized and only then rejected by the aggregate cap.

### Staged/chunked export Blob URL

`WEBCLIP_CREATE_STAGED_TEXT_BLOB_URL` calls `getTransferChunkedBlob()` first and calls `registerBlobUrl()` after the complete Blob has been reconstructed. Importantly, the staged manifest already exposes validated `totalBytes` before chunk materialization. That size can be used for pre-admission instead of waiting until after assembly.

### Required P0-065 contract

Create a Blob-URL reservation object analogous to signed-transfer reservation:

- reserve URL slot + byte upper bound **before** large IDB read/decode/assembly/new Blob;
- for staged text, reserve using validated manifest `totalBytes` before reading chunks;
- for PDF cache, read a small metadata/size record first or maintain a separately validated size receipt so the full Blob is not required to decide admission;
- for inline text, conservatively reserve a safe UTF-8 upper bound from UTF-16 length before `new Blob`, then resize to actual `blob.size` after materialization;
- atomically convert reservation into registered object URL;
- release on all failure paths and on revoke/lifecycle cleanup;
- a caller/runtime timeout must not free a reservation while actual Blob creation remains unresolved;
- global active Blob bytes must mean `reserved + materialized`, not only already registered URLs.

P1-054 remains useful as the final registered-URL cap; P0-065 is the pre-materialization admission layer required to make that cap a memory guarantee rather than only retained-resource accounting.

## P1-156 — prepared Save As is still subject to generic 16-minute TTL

All offscreen Blob URLs get the same `BLOB_URL_FALLBACK_TTL_MS = 16 min` timer in `registerBlobUrl()`. There is no pin/lease mode for a native Save As dialog.

Prepared Save As records are created in service-worker session storage, but offscreen does not know that a Blob URL belongs to a still-live page-owned native dialog. Therefore a user who keeps the OS/browser Save As dialog open longer than the generic TTL can lose the backing Blob even though the product invariant says native Save As is user-owned and must not have an artificial wall-clock timeout.

Required P1-156 refinement:

- prepared/native Save As Blob needs an explicit owner pin/lease separate from automatic-download TTL;
- release only after actual `downloads.download({saveAs:true})` settlement + terminal/reconciled download lifecycle or explicit crash cleanup;
- owner-page loss requires durable reconciliation/GC, not a fixed dialog timeout;
- ordinary automatic Blob downloads may keep their bounded deadline/cancel policy.

## P1-169 — RELEASED tombstones remain unbounded

`releasePreparedSaveAsCheckpoint()` writes a distinct `...:released` tombstone and removes `prepared/started`, which correctly prevents late generations from resurrecting the session. However:

- released keys are not in the active index;
- no TTL/GC path for the released prefix was found;
- the only uses of `PREPARED_SAVE_AS_CHECKPOINT_PREFIX` are key construction/active transitions, not a cleanup scan.

So a long browser session can accumulate released tombstones without bound. Preserve a bounded retention window long enough to defeat late PREPARED/STARTED settlements, then GC them by age/generation. GC must itself be serialized with checkpoint transitions so it cannot remove a tombstone while an older actual storage mutation is still capable of arriving.

## P1-156 active-index crash case reconfirmed

The active prepared index has cap 64, but there is no recovery GC for owner-page loss after PREPARE and before RELEASE. Repeated abandoned native-save sessions can therefore eventually make the browser session permanently return `WEBCLIP_PREPARED_SAVE_AS_LIMIT` until session storage is cleared/restarted.

Need owner-liveness/reconciliation that distinguishes:

- never-started abandoned PREPARED;
- STARTED with a real DownloadItem that can be found via `downloads.search`;
- active user-owned native dialog that must remain pinned;
- terminal/released session safe for bounded tombstone retention.

## P2-018 — dormant text-payload upload confirmed

Fresh runtime search finds `putTransferTextPayload()` only at its definition in the service worker and no `text-payload-upload` caller. Offscreen still exposes the mode.

This reconfirms P2-018's preferred direction: remove the dormant privileged mode/helpers/constants unless a real feature owns them. If retained for future use, its admission must be byte-based before Blob construction; 64 MiB text code units are not equivalent to 64 MiB UTF-8 bytes.

## Required regressions

1. Existing 250 MiB registered Blob + new large staged/inline request is rejected before large Blob materialization.
2. Non-ASCII inline text reserves a conservative byte bound before `new Blob` and cannot transiently exceed global resource budget.
3. Staged export admission uses manifest `totalBytes` before chunk reads/Blob assembly.
4. Reservation remains held through lost/timed-out response until actual Blob creation settles.
5. Native Save As remains usable with a dialog open beyond 16 minutes; automatic downloads retain their bounded lifetime policy.
6. Abandoned PREPARED sessions are reconciled/GC'd without deleting a genuinely active native Save As.
7. RELEASED tombstones remain bounded while still preventing late PREPARED/STARTED resurrection.
8. Dormant `text-payload-upload` is removed or receives an explicit live owner + byte-safe tests.

## Classification

No new P-number created. Extend/refine existing `P0-065`, `P1-156`, `P1-169`, `P2-018`; preserve `P0-063` and `P1-054` invariants.

Previous product test gate was not re-run by this docs-only research checkpoint.

## Retired source: `RESEARCH_DELTA_OFFSCREEN_RESOURCE_IDB_2026-08-27.md`

SHA-256 of UTF-8 source text: `930805f4a57b0a42eb8d6c177f4a8c05fb1d1e1834914f27d06a0dfdc4d07bce`

# Offscreen resource / IndexedDB research delta — 2026-08-27

Baseline source HEAD: `4906002ad9388bf885ab9effa037e0405da4c9e6`.

This checkpoint records fresh evidence against existing P1 items. It is not a canonical registry replacement and does not assign a new P-number. Production/runtime/config/manifest are unchanged by this commit.

## Existing P1-054 status correction — Blob budget is enforced after materialization

Canonical P1-054 currently says offscreen Blob URLs are protected by a global resource budget: max 12 active URLs and 256 MiB aggregate Blob-size. Fresh code review shows that this protects **registered active URLs**, but does not protect the memory peak required to construct/read the next Blob before admission.

Current `registerBlobUrl(blob)` behavior:

1. receives an already-created `Blob`;
2. reads `blob.size`;
3. rejects if `blobUrls.size >= 12` or `activeBlobUrlBytes + size > 256 MiB`;
4. only after that creates the object URL and accounts the bytes.

All three Blob creation paths materialize first and call `registerBlobUrl` second:

- `WEBCLIP_CREATE_PDF_CACHE_BLOB_URL`: `getPdfCacheRecord()` has already returned the cached `pdfBlob` (up to the PDF bound) and `cachedPdfRecordToBlob()` returns/creates the Blob before registration. For blob-v3 this avoids Base64 decode, but the new Blob/reference is still outside `activeBlobUrlBytes` until after the read/materialization.
- `WEBCLIP_CREATE_TEXT_BLOB_URL`: receives the full string, constructs `new Blob([text], ...)`, then applies the global Blob-URL budget.
- `WEBCLIP_CREATE_STAGED_TEXT_BLOB_URL`: `getTransferChunkedBlob()` reads/retains all required chunks and creates the aggregate Blob before `registerBlobUrl()` checks aggregate active Blob budget.

Therefore, with e.g. ~240–250 MiB already registered, another 48–64 MiB candidate can be materialized in the offscreen heap/Blob subsystem and only then rejected. The final URL/accounting invariant remains ≤256 MiB, but the **admission memory peak** can exceed it materially.

Required correction to P1-054:

- Treat P1-054 as PARTIAL until admission occurs before expensive Blob materialization/read aggregation.
- Reserve expected bytes atomically against the same global Blob budget before reading a large PDF record into the active creation path or assembling chunked export data.
- For staged payloads, use already-known manifest `totalBytes` as pre-admission whenever possible; do not first aggregate all chunks merely to discover size.
- For PDF retry-cache, use authoritative cached byte metadata before exposing the Blob to the Blob-URL creation path.
- For direct text, establish a conservative UTF-8/Blob byte upper bound before constructing a potentially very large Blob; sender-side prebound does not replace offscreen authoritative admission.
- Reservation must follow actual creation settlement: failure releases exactly its reservation; caller timeout/response loss must not release while the offscreen creation may still complete.
- Registered Blob bytes + creation reservations must remain within one explicit aggregate budget.

Required regressions:

1. Hold active registered Blob bytes near the 256 MiB cap; request another maximum PDF/staged Blob. The request is rejected **before** aggregate Blob construction/IDB chunk retention attributable to that candidate.
2. Two concurrent create requests cannot both pass a stale pre-check and oversubscribe the cap.
3. Lost response after successful object-URL creation retains reservation/accounting until actual URL cleanup/TTL.
4. Existing max-12 URL count remains enforced together with byte reservations.

No new P1 number is assigned because this is the same resource-budget contract already owned by P1-054. P1-038 remains correctly scoped to removal of Base64→binary PDF decode peak and does not close this aggregate-admission issue.

## Existing P1-086 reconfirmation — readonly IDB result publication still precedes transaction completion

Fresh offscreen review reconfirms the exact PARTIAL paths already documented under P1-086:

- `getPdfCacheRecord()` calls `guard.resolve(resolve, req.result)` directly from `IDBRequest.onsuccess`;
- `getTransferPayload()` does the same;
- `getTransferChunkedBlob()` resolves the collected chunk array immediately after the last request success.

`timeoutIdbTransaction()` treats that Promise as settled; a later `tx.onerror`/`tx.onabort` cannot revoke the already-published result. Those results can then feed Blob construction or signed `fetch`.

By contrast, fresh review confirms that offscreen write/delete staging paths such as storing downloaded transfer records and deleting transfer groups resolve from `tx.oncomplete`. No additional early-publish write path was found in this block.

Required P1-086 implementation remains: request handlers only accumulate `pendingResult`; outer Promise resolves from `tx.oncomplete`; timeout/error/abort wins even if every request already reported success.

## Existing P1-156 / P1-169 reconfirmation — prepared Save As remains the owner-lifetime issue

Fresh `prepared-save-as.js` / offscreen review reconfirms, without adding a new item:

- `chrome.downloads.download({saveAs:true})` intentionally has no artificial caller timeout;
- page listener is armed only after `downloads.download()` returns an id, so a very fast/missed terminal event still requires the P1-156 `downloads.search` reconciliation path;
- `WEBCLIP_PREPARED_SAVE_AS_STARTED` is secondary worker cleanup, not the native-dialog owner;
- offscreen still gives every Blob URL a `BLOB_URL_FALLBACK_TTL_MS = 16 min`, which is incompatible with arbitrarily long user-owned Save As dialog unless P1-156 pins/leases prepared-save Blob lifetime explicitly;
- released tombstone retention remains P1-169.

No new number is assigned.

## Number allocation

P1-195/P1-196 remain evidence-reserved from the OAuth checkpoint. **P1-197, P0-079 and P2-020 remain unassigned after this block.**

## Test / release evidence

Research documentation only. Product runtime/configuration and `manifest.json` are unchanged. Product tests were not rerun; the earlier `88/88 syntax + 74/74 deterministic PASS` remains historical evidence only.

## Retired source: `RESEARCH_DELTA_PDF_CACHE_CONSUMER_LIFECYCLE_2026-08-27.md`

SHA-256 of UTF-8 source text: `f206a5323088c1da0f39e81e981f06bb60e3f721078dec6a3987eafa40f391e4`

# Research delta — PDF cache consumer/lifecycle ownership — 2026-08-27

Baseline HEAD before this research block: `e6d414aed2717fa011f8c8d909bd64d44dcdfeb3`.

Docs-only research checkpoint. Production runtime and `manifest.json` are unchanged. Canonical large-table synchronization is not claimed.

## Scope

Fresh follow-up research of evidence-reserved `P0-079` after the initial same-tab Yandex upload corruption proof. This pass checks every important consumer/invalidation path of the mutable `tab:<tabId>` PDF retry-cache slot: Yandex upload, local cached-PDF download, tab close/navigation/content invalidation and successful-operation cleanup.

## Result

`P0-079` is broader than the original Yandex signed-PUT scenario. The tab-owned cache key is also a time-of-check/time-of-use identity defect for local retry downloads, and tab-wide invalidation/cleanup can delete bytes owned by a different already-admitted or in-flight operation.

No new P-number is created. `P1-199` remains free after duplicate check.

## Exact runtime proof

### 1. Cache metadata validation and Blob creation are separate reads of a mutable slot

`downloadCachedPdf(tabId, operationId)` first calls `getValidCachedPdfForTab(tabId)`.

That helper reads metadata for `pdfCacheKey(tabId)`, checks TTL and fresh current tab URL against cached source URL, and returns metadata object A.

Only later `downloadCachedPdf()` calls:

`createPdfCacheBlobUrl(cached.key)`.

`createPdfCacheBlobUrl()` sends the key to offscreen. Offscreen independently executes `getPdfCacheRecord(pdfCacheKey)` and constructs a Blob from **whatever record currently occupies that key**.

There is no cache generation/owner comparison between the metadata validation and the later offscreen record read.

Therefore URL/TTL validation does not prove that the bytes later downloaded are the bytes whose metadata was validated.

### 2. Offscreen already returns the actual Blob size, but worker discards it

For `WEBCLIP_CREATE_PDF_CACHE_BLOB_URL`, offscreen returns:

- `url`;
- `size: blob.size`.

The service-worker helper `createPdfCacheBlobUrl()` returns only `response.url` and discards `response.size`.

`downloadCachedPdf()` then creates `pendingDownloads` intent using `cached.pdfByteLength` from metadata A rather than the actual Blob B size returned by offscreen.

This creates two deterministic outcomes if operation B replaces the tab slot between validation and Blob creation:

- if A and B have equal byte length, physical PDF B can be downloaded while Journal/recovery metadata still describes A, and size checks cannot detect substitution;
- if sizes differ, B can already be handed to Chrome/downloaded before later reconciliation detects an expected-size mismatch, leaving a wrong/orphan local file even though Journal finalization fails closed.

Checking the returned size would improve diagnostics for the second case but would **not** solve equal-size substitution. Exact immutable cache ownership is still required.

### 3. Tab close deletes the cache of an already-admitted operation

`chrome.tabs.onRemoved` unconditionally calls:

`deleteCachedPdf(tabId)`.

A Yandex save can legitimately have already:

1. completed PDF generation;
2. committed PDF bytes to IndexedDB;
3. detached debugger;
4. continued through account/folder/upload-link preparation;
5. not yet had offscreen read the cached PDF body.

Closing the source tab in that interval deletes `tab:X`. The remote save operation was already explicitly initiated by the user, but its immutable body is destroyed solely because the UI/source tab disappeared.

In an operation-owned design, tab close should invalidate current-document authority and the user-facing latest-retry pointer, but must not delete an exact byte generation still owned by an admitted transfer/reconciliation operation.

### 4. URL navigation has the same ownership conflation

`tabs.onUpdated` calls `deleteCachedPdf(tabId)` whenever `changeInfo.url` is present.

Invalidating a retry pointer on navigation is correct for `P0-023`, but deleting the physical bytes is a different decision. An already-admitted Yandex transfer can still need those bytes after the page navigates.

Document authority and physical transfer-body ownership therefore need separate lifecycle fields. A stale document may no longer authorize a **new retry**, while a transfer already admitted under the old exact document must retain its immutable body until actual settlement/reconciliation.

### 5. Content invalidation is also tab-wide

The content-allowed `WEBCLIP_INVALIDATE_PDF_CACHE` handler calls `deleteCachedPdf(tabId)` with no generation receipt.

That command may be appropriate to invalidate the current retry candidate after page state changes, but with a mutable one-slot cache it also deletes any in-flight generation occupying the same slot. Once P0-079 introduces immutable generations, invalidation must target pointer/authority state rather than indiscriminately deleting all operation-owned bodies for the tab.

### 6. Successful A can delete newer B

Both initial Yandex success and explicit retry success call `deleteCachedPdf(tabId)`.

Therefore if B replaced the slot while A was still running, A's later success deletes B's retry bytes. This is the previously confirmed same-tab cleanup corruption, now seen as the same general lifecycle error as close/navigation invalidation: cleanup is keyed by tab, not by exact owner generation.

## Required P0-079 refinement

### Separate three concepts

The implementation should distinguish:

1. **immutable physical cache generation** — exact PDF bytes plus local content receipt;
2. **in-flight owner/reference** — operation(s) whose actual transfer/reconciliation still need that generation;
3. **latest retry pointer/document authority** — which generation the current tab UI may offer for a new retry.

These have different invalidation rules and must not share one destructive `deleteCachedPdf(tabId)` operation.

### Cache receipt

Each generation should bind at minimum:

- random cache generation id/key;
- worker-issued operation receipt (`P1-198` dependency once implemented);
- journalEntryId where applicable;
- tabId;
- exact source document/navigation generation (`P0-023` dependency);
- normalized source URL;
- byte length;
- strong local digest/fingerprint usable by `P1-184` remote proof;
- created/expiry state;
- in-flight/reconciliation ownership state.

### Consumer admission

All consumers must receive the exact immutable generation, not re-resolve a mutable tab alias:

- Yandex offscreen upload;
- cached local download/Blob creation;
- explicit Yandex retry;
- any future content inspection/digest path.

Offscreen must verify that the retrieved record matches the supplied owner/generation receipt before materializing or uploading bytes.

### Cleanup semantics

- operation A success/failure may release/delete only A's exact generation when no in-flight/reconciliation owner remains;
- tab close/navigation/content invalidation removes or invalidates the retry pointer/document capability but does not evict an already-owned physical body;
- TTL/quota cleanup may reclaim only generations proven not to be needed by actual unresolved side effects/reconciliation, subject to global bounded storage policy;
- compare-and-delete by generation is required; no tab-wide deletion may remove B while A settles.

### Local cached download

The local-download path must bind metadata and Blob bytes using one immutable receipt. If offscreen returns size/digest/owner data, worker must compare it before creating the irreversible Chrome download intent. Size alone is insufficient because equal-sized different PDFs are explicitly in scope.

## Required deterministic regressions

1. Validate cache metadata A, pause before offscreen Blob read, create B in same tab, resume A: local retry downloads A or fails closed; never B.
2. A and B have equal byte length but different bytes: equality cannot hide substitution.
3. A and B have different lengths: no wrong B file is handed to Chrome before owner mismatch is detected.
4. Yandex A is admitted and waiting on folder/upload-link preparation; close source tab: A's immutable cache body remains available until transfer settlement/reconciliation.
5. Navigate source tab after A admission: new retry for stale document is blocked, but A's already admitted body is not deleted.
6. `WEBCLIP_INVALIDATE_PDF_CACHE` invalidates current retry authority without deleting a different in-flight generation.
7. A completes after B generation exists: A cleanup cannot delete B.
8. Maintenance/TTL under storage pressure cannot evict an actually owned unresolved generation; retained generations remain globally bounded by reservation/admission rules.
9. Normal single-operation local retry still creates the expected DownloadItem and Journal metadata from one exact receipt.
10. P1-184 remote verification consumes the same local digest/receipt but remains a separate remote-object proof layer.

## Classification

- Extend evidence-reserved `P0-079`; no new P0/P1 item.
- Preserve `P0-023` for exact current-document retry authority.
- Preserve `P1-184` for remote object/content proof after external settlement.
- Preserve `P1-043`/offscreen budget items for bounded storage/memory admission.
- Preserve `P1-198` for worker-issued live operation identity.
- `P1-199` remains free.

Previous product test gate was not re-run by this docs-only checkpoint.

## Retired source: `RESEARCH_DELTA_PDF_CACHE_OPERATION_ISOLATION_2026-08-27.md`

SHA-256 of UTF-8 source text: `e785d8f7839d9008c815e6d14b7aecd330d74ea186a3a4282653e5cdbc415a72`

# Research delta — PDF retry-cache operation isolation — 2026-08-27

Baseline HEAD before this research block: `08fc05b9cc00b250a194a0a4d01ffb428895508d`.

Docs-only research checkpoint. Production runtime and `manifest.json` are unchanged. Canonical large-table synchronization is not claimed.

## New confirmed item: P0-079 — Yandex PDF retry-cache is tab-owned instead of operation-owned

**Classification:** P0 / evidence-reserved / confirmed by fresh runtime research.

This root cause is independent from:

- `P0-023`, which owns stale same-tab/new-document URL/document identity on later retry;
- `P1-184`, which owns remote-object/content proof after unknown Yandex settlement;
- `P1-043`, which owns shared storage quota admission.

The defect here happens before remote proof: two live save operations in the same tab can overwrite/delete the same local PDF byte slot and thereby mix one operation's metadata/checkpoint with another operation's bytes.

## Exact runtime proof

### 1. Yandex cache key is only the tab id

`pdfCacheKey(tabId)` returns exactly `tab:<tabId>`.

`generatePdfAndUploadToYandex()` stores the newly printed PDF under that key together with operation metadata, `journalEntryId`, `createdAt` and `sourceUrl`.

There is no operation generation/cache lease in the key.

### 2. Local download already demonstrates the safer shape

`generatePdfAndDownload()` does **not** use the tab-global slot for the irreversible download handoff. It writes a temporary cache record under:

`local-download:<operationId>`.

Therefore the codebase already distinguishes operation-owned bytes for local download, while Yandex upload/retry still shares one mutable slot per tab.

### 3. Offscreen signed upload re-reads the current slot at transfer time

The worker does not pass the immutable PDF Blob to offscreen. For Yandex upload it sends `pdfCacheKey` in the `pdf-cache-upload` transfer spec.

`offscreen.js::handleSignedTransfer()` later executes `getPdfCacheRecord(spec.pdfCacheKey)` and constructs the PUT body from whatever record currently occupies that key.

The offscreen request does not carry/verify the originating operationId, Journal entry id, cache generation, source document id or content digest against the retrieved record before using its bytes.

### 4. Deterministic same-tab corruption schedule

A valid schedule exists without requiring simultaneous debugger attachment:

1. operation A finishes `Page.printToPDF`, detaches debugger and stores Blob A under `tab:X`;
2. A continues through slower Yandex folder/account/upload-link preparation;
3. operation B in the same tab starts after A's print phase, forms PDF B and overwrites `tab:X` with Blob B;
4. A obtains its signed upload link and asks offscreen to upload `tab:X`;
5. offscreen reads Blob B and sends B's bytes to A's remote path while the worker still holds A's filename/meta/journalEntryId/expected byte count;
6. if B happens to have the same byte length as A, the current exact-size verification does not expose the substitution; A can be finalized with metadata for A but bytes from B.

If sizes differ, the final size check can detect failure only **after the wrong bytes have already been uploaded** to A's chosen remote path, leaving an externally visible wrong/orphan object requiring reconciliation.

### 5. Cleanup can delete another live operation's retry bytes

After successful Yandex upload, both the initial-send path and explicit retry path call `deleteCachedPdf(tabId)`, which deletes the current `tab:X` record rather than the exact cache record owned by the completing operation.

Therefore A can complete after B has replaced the slot and delete B's retry cache. B can then fail later because its own bytes disappeared, or lose the user's promised safe retry artifact.

### 6. Page-local busy UX is not a worker safety boundary

A correctness invariant cannot rely on one content UI staying single-flight. The same tab can receive actions through content UI, popup/context menu/retry paths and hostile-page/synthetic control paths already tracked elsewhere. The service worker currently has no per-tab/per-operation PDF cache ownership lease preventing the schedule above.

## P0-079 required contract

### Immutable operation-owned cache receipt

Every generated PDF that may cross an irreversible boundary must have an immutable cache receipt, for example:

- random cache id / operation generation in the cache key;
- operationId;
- Journal entry id;
- tab id;
- exact source `documentId` / navigation generation where available (`P0-023` dependency);
- source URL;
- byte length;
- content digest/fingerprint suitable for the stronger `P1-184` remote-content proof;
- created/expiry timestamps.

The physical cache record used by an in-flight operation must never be replaceable merely because another save started in the same tab.

### Latest-retry pointer is separate from byte ownership

If UX wants one "latest retry" per tab, store that as a small versioned pointer/receipt to one immutable cache record. Replacing the pointer must not overwrite or delete bytes already owned by another in-flight operation.

Retry admission must fresh-check the pointer's source document identity per `P0-023` before authorizing use.

### Offscreen transfer must verify exact cache ownership

`pdf-cache-upload` should receive an exact immutable cache receipt/key and, before creating the request body, verify the retrieved record belongs to that operation/generation. A stale/mismatched cache record is fail-closed; do not silently upload whichever record currently resolves from a mutable tab key.

### Cleanup must be compare-and-delete by owner

A completing A may delete only A's exact cache generation. It must never call a tab-wide delete that can remove B's newer/in-flight cache.

Tab close/navigation may invalidate the retry pointer, but cleanup of immutable in-flight generations must respect actual transfer settlement and bounded TTL/storage policy rather than deleting another operation's body prematurely.

### Bounded retention

Operation-scoped keys must not turn the old one-slot design into unbounded cache growth. Preserve TTL/maintenance and shared storage-admission rules; add a bounded active/retry generation policy that never evicts an actually owned in-flight generation before its physical settlement/reconciliation.

## Relation to P1-184

P0-079 proves which **local PDF bytes** belong to an operation before signed upload. P1-184 then proves which **remote object/content** resulted from that operation after upload/unknown settlement.

A local content digest can be part of both receipts, but one does not replace the other. Fixing only remote path+digest logic while offscreen can read another operation's local Blob is insufficient.

## Required deterministic regressions

1. A caches PDF A; B overwrites the old tab-level pointer/starts a newer save before A offscreen read: A still uploads A, never B.
2. A and B produce equal-sized different PDFs: byte-size equality cannot hide cross-operation substitution.
3. A completes after B cache creation: A cleanup does not delete B's cache/retry receipt.
4. B completes first: B cleanup does not invalidate A's already admitted/in-flight transfer.
5. A fails after signed PUT of wrong/unknown outcome: A's exact local content receipt remains available for P1-184 reconciliation; no fallback to B bytes.
6. Same-URL reload after cache generation: retry fails closed by exact document generation per P0-023.
7. User starts a new save while an old retry is in progress: both operations retain separate immutable byte owners; UI may choose which is "latest" without changing in-flight bodies.
8. Cache TTL/quota cleanup skips exact in-flight owner generations until actual settlement/reconciliation and remains globally bounded.

## Numbering

- New evidence-reserved `P0-079` assigned by this block.
- `P1-198` remains free.
- Existing evidence-reserved `P1-195`, `P1-196`, `P1-197` remain separate.
- No `P2-020` assigned.

Previous product test gate was not re-run by this docs-only checkpoint.

## Retired source: `RESEARCH_DELTA_PDF_END_TO_END_PROVENANCE_2026-08-27.md`

SHA-256 of UTF-8 source text: `14a8904960c0d77a8c321020a9a4245d9eec70392f71edd2e8870f60ac28ab0c`

# Research delta — end-to-end PDF document/content provenance — 2026-08-27

Source-of-truth `main` immediately before this write: `e4d588284cc96aca95c7e2107ed0b3c9da275e3c`.

Docs-only research checkpoint. Production runtime, tests, configuration and `manifest.json` are unchanged. Canonical large-table synchronization is not claimed by this file.

## Classification

No new P-number is assigned.

Fresh source proof composes and refines existing:

- **P0-070** — live PDF generation must remain bound to the exact initiating top document/navigation generation;
- **P0-023** — cached-PDF retry authority must not survive same-URL document replacement;
- **P0-079** — immutable operation-owned PDF byte/cache generation instead of mutable `tab:<tabId>` ownership;
- **P1-184** — exact remote object/content proof after upload/unknown settlement;
- **P0-073/P0-074** — exact Yandex account/root/auth/config operation context;
- **P0-076** — exact Journal generation/revision before delayed finalization;
- **P1-198** — worker-issued physical operation receipt rather than caller-owned textual `operationId`.

Adjacent diagnostics owner: **P1-147**. Fresh evidence below proves that post-print diagnostics themselves are currently tab-addressed and can describe a newer document than the PDF they are logged against.

The missing implementation-level invariant is one continuous **provenance chain** from the initiating document to the final Journal/remote object. Existing items correctly own individual boundaries, but current runtime does not carry a durable receipt across those boundaries.

## Fresh source proof — document identity is dropped at worker admission

### 1. Runtime sender has document identity, save handlers keep only tabId

The content-allowed handlers for local/Yandex PDF save obtain:

`const tabId = sender.tab?.id`

and invoke:

- `generatePdfAndDownload(tabId, sanitizeContentSaveMeta(...), operationId)`;
- `generatePdfAndUploadToYandex(tabId, sanitizeContentSaveMeta(...), operationId)`.

`sender.documentId` is not passed to either operation.

`sanitizeContentSaveMeta(rawMeta, sender)` derives authoritative URL/origin from `sender.tab.url` / `sender.url`, which is a useful anti-spoofing boundary, but its normalized result contains URL/title/date/selection/resource metadata — not an immutable top-document receipt.

Therefore worker admission already loses the exact identity of the document that emitted the save request.

This is the first boundary owned by P0-070.

### 2. `generatePdfBlob(tabId)` targets current tab state, not admitted document

The PDF helper attaches Chrome Debugger to `{ tabId }` and invokes `Page.printToPDF` against whichever document is current in that tab at command time.

The existing debugger actual-settlement serialization/deadlines remain positive controls. They prevent overlapping/late debugger attachment corruption, but they do not prove that the current document is the one that initiated the save.

Navigation/reload after the content message but before `Page.printToPDF` can therefore print a replacement document while metadata still represents the earlier sender.

## Fresh source proof — post-print diagnostics have a second document-retarget window

### 3. Both PDF flows perform a new tab-only read after PDF bytes already exist

Immediately after:

`let pdfBlob = await generatePdfBlob(tabId)`

both local and Yandex save paths call:

`const printDiagnostics = await collectPrintDiagnosticsForTab(tabId)`.

Only after that read do they proceed to OperationLog copy-save diagnostics and cache/download/upload preparation.

### 4. `collectPrintDiagnosticsForTab()` sends by tabId only

The helper executes:

`chrome.tabs.sendMessage(Number(tabId), { type: 'WEBCLIP_COLLECT_PRINT_DIAGNOSTICS' })`

with no exact `documentId`, no expected navigation generation and no response-side proof that the answering content script belongs to the document that was printed.

A valid race is therefore:

1. document A initiates save;
2. Chromium physically prints A and returns PDF bytes A;
3. top tab navigates/reloads to document B before post-print diagnostics RPC;
4. `tabs.sendMessage(tabId)` reaches B;
5. OperationLog records B's page/print structure as diagnostics attached to PDF A.

This is not merely cosmetic. P1-147 diagnostics are intended to explain what was actually selected/printed. Cross-document attachment makes forensic evidence positively misleading.

If navigation happens slightly earlier, the stronger P0-070 failure remains possible: PDF itself can already be B while admission metadata is A.

### 5. Post-print diagnostics must be exact-document or explicitly unavailable

The correct fix is not to treat diagnostic success as required for preserving a valid already-formed PDF. Instead:

- if the exact admitted/printed document generation is still alive, query that exact document;
- if it is gone, record diagnostics as stale/unavailable for that receipt;
- never query the replacement current document and present its answer as evidence for the old PDF.

A document-generation mismatch before the immutable PDF receipt/cache admission is a separate P0-070 fail-closed decision: do not continue save finalization under mixed provenance.

## Fresh source proof — cache loses document lineage

### 6. Yandex PDF cache stores tab/URL metadata but no exact document generation

After print, `generatePdfAndUploadToYandex()` creates the cache record using:

- `key: pdfCacheKey(tabId)`;
- `tabId`;
- filename;
- normalized save metadata;
- random `journalEntryId`;
- PDF Blob;
- createdAt;
- normalized `sourceUrl`.

Current metadata persistence records URL/meta/size/cache format/temporary/journalEntryId, but no exact initiating `documentId`, navigation generation, worker-issued operation receipt or strong PDF content digest.

P0-079 already proves the mutable tab key can substitute another operation's bytes. This pass adds the document-lineage consequence: even if the key were made immutable tomorrow, a cache generation containing only URL cannot prove which same-URL document produced those bytes.

### 7. Retry validation proves URL + TTL, not document identity

`getValidCachedPdfForTab(tabId)` currently:

1. loads metadata by `pdfCacheKey(tabId)`;
2. checks cache TTL;
3. fresh-reads current tab URL;
4. compares it to cached source URL;
5. returns the cache when the URL strings match.

A same-URL reload/document replacement therefore satisfies the current admission test. This is the existing P0-023 root cause.

The fix must consume the same source-document receipt produced for P0-070; P0-023 should not invent a separate weaker notion of document identity.

## Fresh source proof — Yandex recovery cannot reconstruct lost source-document provenance

### 8. Remote-save checkpoint inherits cache metadata, not a source-document receipt

`uploadCachedRecordToYandex()` creates the durable remote checkpoint using:

- exact intended Journal id;
- account/root/path metadata;
- expected PDF byte count;
- publication preference snapshot;
- `meta` copied from the cached PDF record;
- textual operationId.

The already-researched remote-save generation defect means multiple physical attempts can also overwrite/mutate the same `journalEntryId` row until a real remoteSaveGenerationId/CAS receipt is introduced.

But even after that generation fix, current checkpoint inputs do not contain the exact source-document generation. Recovery after MV3 restart therefore cannot recreate provenance that was discarded before cache admission.

### 9. Remote exact object proof cannot repair a wrong local lineage

P1-184 may eventually prove that remote object R contains exactly local PDF generation G. That is necessary, but it does not prove that G came from document A unless P0-070/P0-079 already bound G to A.

Likewise a perfect remoteSaveGenerationId cannot tell whether PDF generation G was generated from the intended document if the source-document receipt was never persisted.

The chain must be conjunctive, not interchangeable:

`document receipt -> PDF generation/content receipt -> transfer attempt -> remote-save generation -> remote object/content proof -> Journal finalization`.

A strong receipt at a later layer cannot retroactively repair a missing earlier link.

## Unified provenance contract

### 1. Source document receipt

At save admission, create/capture a worker-authoritative source receipt containing at least:

- top tab id;
- exact sender `documentId` when Chrome supplies it;
- worker navigation/full-document generation for the tab;
- normalized admitted URL/origin;
- Incognito/privacy classification where relevant;
- worker-issued operation receipt/generation from P1-198.

The textual URL is descriptive/secondary identity, not the document-generation authority.

### 2. Pre-print fence

Immediately before `Page.printToPDF`, prove that the current top document/navigation generation still equals the admitted source receipt.

Mismatch = fail closed before print. Do not silently retarget the operation to the new document.

### 3. Print generation / immutable PDF receipt

Once `Page.printToPDF` returns bytes, create an immutable PDF generation/content receipt before any mutable tab-scoped handoff.

Bind at minimum:

- random PDF/cache generation id;
- source document receipt;
- operation receipt;
- exact byte length;
- strong local digest/fingerprint;
- creation timestamp;
- intended Journal id where already assigned.

P0-079 owns immutable physical byte storage/consumer ownership; this document receipt must be part of that record.

### 4. Post-print generation fence

Before the newly formed PDF is admitted to download/cache/Yandex finalization, fresh-check the same source-document/navigation generation again.

If it changed during print or immediately after print, do not finalize a mixed-source save. Destroy/release the unadmitted Blob according to bounded resource rules and return an explicit stale-navigation result.

This is exactly the post-print requirement already stated by P0-070; this pass clarifies that the check must precede immutable consumer admission.

### 5. Exact-document diagnostics

P1-147 post-print diagnostics must carry the same source receipt or be addressed to exact `documentId` where supported.

A replacement document may never answer diagnostics for the old receipt.

If the original content document is gone while the PDF receipt is otherwise valid under the chosen ordering, diagnostics should be `unavailable/stale-document`, not borrowed from the current tab document.

### 6. Retry pointer vs physical PDF generation

Navigation/reload invalidates the current tab's authority to start a **new retry** from an old document generation (P0-023).

It must not automatically destroy an immutable PDF body already owned by an admitted download/upload/reconciliation operation (P0-079 consumer-lifecycle refinement).

Model separately:

- immutable PDF generation;
- in-flight physical owner/reference;
- latest-retry pointer + current-document authority.

### 7. Remote-save attempt composition

Each Yandex physical attempt receives its own immutable `remoteSaveGenerationId` and transfer attempt receipt.

That receipt must reference the exact immutable PDF generation/content receipt, which in turn references the exact source document receipt.

Never reconstruct this relation from `journalEntryId`, `tabId`, URL, filename or expected size after restart.

### 8. Remote proof and Journal finalization

P1-184 verification proves the exact remote object/content corresponds to the exact local PDF generation.

P0-076 final local Journal append additionally proves the intended Journal generation/revision/checkpoint generation is still current.

The Journal entry should retain enough bounded provenance to explain/diagnose:

- which local operation produced it;
- which source document generation was admitted;
- which immutable PDF generation was consumed;
- which remote/download physical receipt settled.

This does not require exporting privacy-sensitive raw internal identifiers if they are not product data; the durable internal receipts may be normalized/redacted in user-facing exports/logs while preserving local authority.

## Required implementation order

A safe implementation order is important because partial fixes otherwise create false confidence:

1. **P1-198** worker-issued operation receipt / ownership primitive.
2. **P0-070/P0-023** one shared top-document/navigation receipt and pre/post-print/retry fences.
3. **P0-079** immutable operation-owned PDF generation keyed independently from tab, including source receipt + digest.
4. Update local DownloadItem intent and Yandex signed transfer to consume the exact PDF receipt, never a mutable tab alias.
5. Add Yandex `remoteSaveGenerationId` + transfer-attempt phase/CAS and reference the exact PDF generation.
6. **P1-184** reconcile remote object/content against the retained local content receipt.
7. **P0-076** exact Journal finalization generation/CAS.
8. Only then remove/reclaim immutable bodies/receipts when all in-flight/reconciliation ownership is released under bounded quota/TTL policy.

Steps may be implemented in one patch, but acceptance must test the full chain. Closing only a later layer must not mark earlier provenance owners resolved.

## Deterministic regression matrix

1. A sends save with `documentId=A`; navigate to B before debugger print: no PDF side effect for B and no Journal/cache entry from mixed A/B metadata.
2. Same-URL reload A -> B before print: URL equality does not bypass the document-generation fence.
3. Print A succeeds; navigate to B before post-print diagnostics: B diagnostics are never attached to PDF A.
4. If exact A diagnostics cannot be obtained after print, log explicit stale/unavailable diagnostics rather than querying current B.
5. Navigate after PDF bytes exist but before immutable cache admission: operation fails closed and unadmitted Blob is released; no Yandex/download handoff starts.
6. A PDF generation is durably admitted, then source tab navigates/closes while Yandex upload is already admitted: retry authority is invalidated, but A's owned body remains until transfer settlement/reconciliation.
7. Same-URL reload after cached retry generation: new document cannot retry old generation without explicit stronger user/rebind semantics; default is fail closed.
8. A and B same tab, equal-size different PDF bytes: immutable generation ids/digests prevent substitution even when URL and size match.
9. A remote-save attempt references PDF generation GA; newer B retry references GB: late A verification cannot mutate B's remote generation or consume GB.
10. MV3 restart after transfer-admitted unknown settlement: recovery loads remoteSaveGeneration -> exact PDF/content receipt -> exact source-document receipt linkage without reconstructing it from tab/URL.
11. Remote path contains a same-size unrelated object: P1-184 rejects it even though document/cache provenance is correct.
12. Remote exact object proof succeeds, but Journal generation was replaced by clear/import: P0-076 prevents stale local finalization while remote reconciliation evidence remains diagnosable.
13. OperationLog clear/reuse of display operationId cannot alter the durable source/PDF/remote receipt authority (P1-197/P1-198 composition).
14. Cross-origin iframe print generation P1-199 remains separately fenced; valid top-document receipt does not make stale child-frame restore safe.
15. Normal single-operation save without navigation preserves current user-visible behavior while carrying the stronger internal receipts.

## Duplicate check / numbering

No new P-number is created.

- **P0-070** owns document admission and pre/post-print generation truth.
- **P0-023** owns current-document authority for later retry.
- **P0-079** owns immutable local PDF bytes/generation and exact consumer ownership.
- **P1-184** owns remote object/content proof.
- **P0-073/P0-074** own Yandex account/root/auth/config namespace/operation context.
- **P0-076** owns stale Journal generation finalization.
- **P1-198** owns locally issued operation identity; textual operationId is not sufficient authority.
- **P1-147** owns truthful print diagnostics, with this pass adding exact-document addressing as a dependency.
- **P1-199** remains cross-origin iframe print operation-generation fencing; it is not reassigned.
- **P1-200/P1-201** remain remote-frame control generation / optional-permission revocation lifecycle.

The point of this checkpoint is not a new category. It prevents implementing the existing categories as independent local patches that still leave a broken end-to-end chain.

## Test / release state

No product tests were rerun for this docs-only research checkpoint. The last proven product gate remains the historical **88/88 JavaScript syntax + 74/74 deterministic tests PASS**.

Current `manifest.json` remains version **0.9.8** with minimum Chrome **118**. No runtime/config/manifest change, build, tag or GitHub Release is made by this research checkpoint.

## Retired source: `RESEARCH_DELTA_PDF_PREPARATION_SIDE_EFFECTS_2026-08-27.md`

SHA-256 of UTF-8 source text: `bd83450de73acb9ea17341d8a3ffc547a9485e1e625a152c288ee01886dfabc0`

# Research delta — PDF preparation side effects — 2026-08-27

Baseline HEAD before this research block: `8464107d062ed5bda56a8e4fd29e5dcda551ba36`.

Docs-only research checkpoint. Production runtime and `manifest.json` are not modified. Canonical registry synchronization is not claimed by this file.

## Scope

Fresh research of live host-page mutations performed before `Page.printToPDF`, focused on existing `P0-067`, `P0-068`, `P0-071`, `P1-003` and hostile-page boundary `P0-075`.

## Confirmed runtime facts

1. `prepareForPrint()` calls `expandSpoilersInIncludedContent()` before resource prefetch and print.

2. Native `<details>` within Included content are opened by mutating the **live page DOM** with `details.open = true`. The source comment says the expanded state is intentionally kept after PDF.

3. Current browser semantics dispatch a `toggle` event whenever `<details>` state changes. Therefore programmatically setting `open` is not an inert alternative to `.click()`: host-page JavaScript can observe that change and execute arbitrary page logic.

4. Non-native disclosure handling explicitly calls `control.click()` through `triggerInternalClick(control)` and waits for page handlers. The current allowlist can accept semantic-toggle anchors and even `button[type=submit]` when ARIA/data toggle attributes are present. This is direct page-owned event execution during save preparation.

5. Resource prefetch also mutates live host DOM: lazy images can receive temporary `loading=eager`, `src=data-src` and `srcset=data-srcset`. Those mutations are intentional for P1-003 renderer prefetch and use a URL allowlist (`http/https/data/blob`), but they remain page-visible DOM mutations and can be observed by hostile MutationObservers. They must not be confused with an authorization boundary for executing arbitrary page controls.

6. Same-origin iframe flattening still mounts a clone into top-document `body` after only partial neutralization; this remains P0-068 and is not duplicated here.

7. Link normalization still occurs on live Included DOM before the browser's `beforeprint` phase, leaving the known hostile mutation window from P0-071; this block does not create a new item for it.

## P0-067 acceptance refinement

The existing principle “do not synthetic-click page controls during save” must be stronger than simply replacing `.click()` with a different mutation on the live page.

A safe implementation must ensure that PDF-only disclosure expansion does **not execute host-page interaction/lifecycle code**. In particular:

- no `HTMLElement.click()` / synthetic user activation during PDF preparation;
- do not rely on `details.open = true` on the live source DOM as a guaranteed inert action, because the resulting `toggle` is observable by the page;
- do not trigger form submission/navigation/page-owned accordion loaders in order to create a PDF;
- content that requires real site interaction should either be expanded by the user explicitly before save or represented in a WebClip-owned inert print clone/snapshot where changing disclosure visibility cannot invoke host-page JS;
- native disclosure visual state may be represented as open in an inert clone even if the source `<details>` remains untouched;
- if a feature intentionally needs network-loaded hidden content, it needs its own explicit, bounded and non-destructive resource policy rather than impersonating a page click.

## Relation to P0-068 / P0-071 / P0-075

The clean architectural direction is shared: build a bounded **inert/frozen print representation** and apply disclosure visibility, safe link schemes, iframe flattening and print-only markers there instead of progressively mutating the hostile source DOM.

This does not merge the P-items:

- P0-067 owns page-control/event side effects;
- P0-068 owns active semantics/network/custom-elements in flattened iframe clones;
- P0-071 owns unsafe/TOCTOU URI annotations in the actual printed representation;
- P0-075 owns hostile-page visibility/control-plane isolation.

But their acceptance criteria should be implemented by one coherent print-representation boundary where practical.

## P1-003 boundary

Renderer resource prefetch is a deliberate product feature and is not reclassified as a defect merely because it can perform network loading. Preserve its existing budgets and rollback. The critical distinction is:

- resource loading is an explicitly bounded preparation capability;
- arbitrary page control activation is not.

Tests should separately prove both behaviors.

## Required regressions before closure

1. Host page registers `click`, `submit`, `toggle` and navigation handlers on disclosure controls; PDF preparation does not invoke them.
2. Closed native `<details>` appears expanded in the produced printable representation without changing the live source element / firing a source-page `toggle`.
3. Semantic-toggle `button[type=submit]` cannot cause submit during save.
4. Semantic-toggle anchor cannot navigate or execute page handler as a side effect of save.
5. Existing P1-003 resource prefetch still loads intended images/fonts/backgrounds within budgets and rolls back temporary resource attributes.
6. Hostile MutationObserver cannot use PDF-only disclosure/link/iframe transformation as an authorization path to trigger WebClip-owned save mutations.
7. Print representation remains compatible with P0-071 safe-URI and P0-068 inert-flattening regressions.

## Classification

No new P-number created. Extend/refine existing `P0-067`; preserve linked acceptance in `P0-068`, `P0-071`, `P0-075`, `P1-003`.

Previous product test gate was not re-run by this docs-only research checkpoint.

## Retired source: `RESEARCH_DELTA_PDF_RETRY_CACHE_APPLICATION_GENERATION_2026-08-28.md`

SHA-256 of UTF-8 source text: `c1bf5df704a97f2547a58039149389c7147d4415ea2fedc0a8c4d4bfbc9c21e8`

# Research delta — PDF retry cache needs same-document application generation — 2026-08-28

Source-of-truth `main` immediately before this write: `0baaa84eaa34e4b1eac73ee308e0caffa83faf5c`.

Docs-only research checkpoint. Runtime/tests/configuration/manifest are unchanged.

## Classification

No new P-number is assigned.

Primary existing owners:

- **P0-023** — PDF retry cache identity/invalidation;
- **P0-080** — same-document SPA/application generation authority;
- **P0-070** — full browser-document identity remains a separate required fence.

## Existing cache controls

`getValidCachedPdfForTab(tabId)` already performs two important checks:

1. cache TTL (`PDF_CACHE_TTL_MS`);
2. current tab URL must equal `cached.sourceUrl` / cached metadata URL.

If tab lookup fails or URL differs, the cached PDF is deleted and retry fails closed.

P0-023 additionally requires exact `MessageSender.documentId`/full-document identity so same-URL reload cannot reuse a PDF from an old document.

Those controls are necessary but not sufficient for P0-080 same-document application changes.

## Fresh source proof

A SPA/application can change the meaningful page representation without changing either:

- tab URL; or
- browser `documentId`.

Examples include:

- replacing the selected route subtree while intentionally keeping the same URL;
- client-side filters/tabs/views that replace the article/content state without History API navigation;
- `history.replaceState()` to the same normalized URL;
- application state restoration that materially changes selected content while preserving the browser document.

After WebClip has already generated PDF A, the cache record keeps bytes/metadata for A. `getValidCachedPdfForTab()` currently asks only whether current URL still equals the cached URL (plus TTL; future P0-023 document identity).

Therefore cached A can remain accepted after the live application is in state B.

## Deterministic schedule

1. Same browser tab/document/application generation A is visible at URL U.
2. User selects content and WebClip generates PDF A.
3. Yandex upload fails; retry cache keeps PDF A as intended by P0-007.
4. Site changes its application representation to B while URL remains U and `documentId` remains D.
5. User now sees B.
6. Context menu/UI invokes `retry-yandex`.
7. Cache validation sees:
   - same tab;
   - same URL U;
   - same document D once P0-023 is implemented;
   - TTL valid.
8. WebClip uploads PDF A even though the visible/current application state is B.

The bytes themselves are not corrupted — retry correctly preserves the original failed artifact — but the product currently lacks a way to tell the user whether the retry operation still belongs to the currently displayed application generation.

## Relationship to retry semantics

P0-007 intentionally requires a retry to reuse **the same PDF bytes** after a Yandex error. Re-rendering B automatically would violate that invariant.

Therefore the fix is not “regenerate on any SPA mutation”. The required distinction is:

- **artifact retry receipt A** — explicitly retry the previously generated PDF A;
- **current page generation B** — what the user is looking at now.

If A != B, WebClip must not silently present the retry as if it were a save of B.

Acceptable policy options include:

1. invalidate/disable page-context Retry after application generation changes and require the user to explicitly reopen/retry historical A from a receipt/log; or
2. show explicit wording that retry will upload the previously generated PDF from generation A, not the currently displayed page B, and require confirmation.

## Required P0-023/P0-080 refinement

### Cache provenance receipt

A cached PDF should carry immutable provenance at least for:

- full browser document generation (P0-023/P0-070);
- same-document application/selection generation (P0-080);
- source normalized URL;
- PDF content generation / operation id;
- selection snapshot generation or equivalent receipt.

### Retry admission

Before a page-scoped Retry command, compare the cache provenance with the current content/application generation.

- exact match -> ordinary retry of same artifact is allowed;
- full-document mismatch -> fail closed under P0-023;
- application-generation mismatch -> do not silently treat old artifact A as current page B; require the chosen explicit historical-retry policy.

### No mutation-based invalidation of unknown settlement

If a Yandex upload of PDF A already has unknown external settlement, application generation B does not cancel or rewrite A's remote recovery receipt. Remote reconciliation remains attached to A.

## Required regressions

1. PDF A fails upload, page unchanged -> retry sends exact A bytes.
2. PDF A fails -> same URL full reload -> P0-023 rejects page-scoped retry of A.
3. PDF A fails -> SPA representation changes with same URL/document -> page-scoped retry does not silently masquerade as save of B.
4. Explicit historical retry policy, if implemented, clearly identifies A and still sends exact A bytes.
5. SPA state changes then returns visually to A without a matching generation receipt -> do not infer identity from appearance/URL alone.
6. Unknown remote settlement for A remains reconciled as A after page changes to B.
7. A new save in B creates a new artifact/content generation and cannot overwrite A's recovery identity merely because URL is the same.

## Duplicate check

P0-023 currently addresses URL + full-document identity; P0-080 addresses same-document selection/application generation. Repository history contained no dedicated research checkpoint applying P0-080 to the **retry-cache artifact provenance** boundary.

This is therefore a new manifestation of those existing owners, not a new root-cause number.

## Test / release state

Documentation only. Product tests were not rerun. Historical evidence remains **88/88 JavaScript syntax + 74/74 deterministic tests PASS**. Runtime version remains `0.9.8`; no build, tag or GitHub Release was created.

## Retired source: `RESEARCH_DELTA_PDF_RETRY_CACHE_SPA_APPLICATION_GENERATION_2026-08-28.md`

SHA-256 of UTF-8 source text: `56cefef53a44a75daaceceacf719a8d3397fb3b85e33819465c1a9a092a31089`

# Research delta — PDF retry cache needs explicit SPA/application-generation semantics — 2026-08-28

Source-of-truth `main` immediately before this write: `91848ea1aea714fb1670dc0ebaf2073bf5293797`.

Docs-only research checkpoint. Runtime/tests/configuration/manifest are unchanged. No new P-number is assigned.

## Classification

Primary existing owners:

- **P0-023** — retry-cache identity/invalidation;
- **P0-080** — same-document SPA/application-generation authority;
- **P0-007** — Yandex retry must reuse the same already-generated PDF rather than silently regenerate it.

Adjacent operation-receipt work: P0-079/P1-198/P1-210.

## Fresh source proof

`getValidCachedPdfForTab(tabId)` verifies a cached PDF with three important checks:

1. cache record exists;
2. `createdAt` is inside `PDF_CACHE_TTL_MS`;
3. a fresh bounded `tabs.get(tabId)` returns a URL whose normalized value equals `cached.sourceUrl || cached.meta.url`.

If the URL differs, the cache is deleted and cannot be retried.

This is a useful positive control for ordinary A->B navigation, but it is not an application-generation proof. P0-080 already established that the same browser document and even the same textual URL can host a completely replaced SPA/application representation.

Therefore current cache admission can satisfy:

`currentUrl === cachedUrl`

while the current visible application generation no longer corresponds to the PDF bytes in the cache.

## Important product distinction

This does **not** imply that cached PDF bytes themselves become invalid when the page changes. P0-007 explicitly requires retry to reuse the exact already-generated PDF after Yandex failure.

The missing contract is about **what the UI/runtime claims the retry is bound to**.

There are two valid designs, but they must not be mixed implicitly:

### A. Operation-artifact semantics

The cached PDF is an immutable artifact of historical operation generation G.

Retry means: "retry sending **this already-generated PDF G**" regardless of whether the current page has since changed.

Then the retry surface must show/retain a bounded source receipt for G (URL/title/timestamp/application/document/selection generation as appropriate), and should not pretend that current page state proves the artifact belongs to the current route.

A current-tab URL equality check becomes a UX/safety hint rather than the sole identity authority.

### B. Current-page retry semantics

If product semantics require retry cache to remain attached to the currently visible page, then URL equality is insufficient. The cache must also carry an application-generation/document receipt and retry must prove current generation compatibility under P0-070/P0-080.

A same-URL SPA replacement must invalidate or explicitly conflict with the old cache.

## Deterministic same-URL schedule

1. Route/application generation A at `https://example.test/item` is selected and PDF bytes PA are generated.
2. Yandex upload fails; PA remains in retry cache with source URL U.
3. The SPA replaces the route/content with application generation B while preserving textual URL U and browser documentId.
4. `getValidCachedPdfForTab()` fresh-reads the tab and still sees U.
5. Current cache check passes because `currentUrl === cachedUrl`.
6. User invokes `retry-yandex` from the persistent WebClip surface/context command.
7. Worker sends PA, even though the current page representation is B.

Sending PA may be exactly correct if the user is explicitly retrying historical operation A. It is misleading if the UI/runtime treats URL equality as proof that PA represents current B.

## Required P0-023/P0-080 refinement

Define one explicit cache identity model and encode it in the durable cache receipt.

At minimum the receipt should distinguish:

- immutable PDF/content generation;
- source URL observation;
- browser document generation when available;
- same-document application/navigation generation when the cache is page-bound;
- originating selection/operation receipt;
- creation time/TTL.

Do not infer equivalence of application generations from URL equality alone.

### If operation-artifact semantics are chosen

- retry remains allowed after page/application changes;
- UI labels it as retrying the existing cached PDF, not current page content;
- metadata/Journal finalization must continue to use the cached artifact's original receipt, never rebuild from current page B;
- a newer PDF generation for the same tab must not overwrite/retarget the old attempt without explicit generation replacement semantics.

### If current-page semantics are chosen

- current application generation must match the cache receipt;
- same-URL DOM/app replacement conflicts and disables current-page retry;
- user may still be offered an explicitly historical "retry cached PDF A" action if operation-artifact semantics are also supported as a separate action.

## Regression requirements

1. Ordinary same page, failed upload -> retry sends exact cached bytes and original metadata.
2. Full navigation to another URL -> old cache remains rejected as today.
3. Same-document URL change A->B -> no silent claim that cache A represents B.
4. Same URL, SPA replaces content -> operation-artifact retry is clearly identified as historical A, or current-page retry is blocked by generation mismatch.
5. Retry never regenerates PDF merely because current page changed; P0-007 remains intact.
6. Journal entry created after retry uses the immutable cached operation/content receipt, not newly observed page title/URL/selection unless an explicit new operation is started.
7. A new PDF generation on the same tab cannot make recovery of an unresolved older remote attempt ambiguous.

## Duplicate check

Repository commit search found no dedicated retry-cache checkpoint for same-document application generation. Existing P0-023 owns cache identity; P0-080 supplies the newly proven application-generation dimension. A new P-number would duplicate those owners.

## Test / release state

Documentation only. Product tests were not rerun. Historical evidence remains **88/88 JavaScript syntax + 74/74 deterministic tests PASS**. Runtime version remains `0.9.8`; no build/tag/Release was created.

## Retired source: `RESEARCH_DELTA_PREPARED_DOCUMENT_DEBUGGER_HANDOFF_2026-08-28.md`

SHA-256 of UTF-8 source text: `fc938267e4a3a4c860479a5a64ddab201b6bec0198bd4529ab2cdc2c36cc5ff0`

# Research delta — prepared document to debugger PDF handoff — 2026-08-28

Source-of-truth `main` immediately before this write: `ab9a4f368236cf0e07fe8c160a2d278cb3951892`.

Docs-only research checkpoint. Runtime/config/manifest/tests are unchanged.

## Classification

No new P-number is assigned.

Fresh source proof refines **P0-070** and the end-to-end PDF provenance contract. It composes with **P0-075/P0-004** frozen printable representation, **P1-198** operation receipt, **P0-079** immutable PDF generation and **P1-147** exact-generation diagnostics.

## Fresh handoff proof

### 1. Content prepares one exact living document before worker admission

Both local and Yandex save flows execute:

`await prepareForPrint(meta)`

inside the content script before sending the privileged runtime save message.

That preparation mutates/constructs print state in the current content document: selected-only styles, resource preparation, frame preparation and related print representation state.

Thus a successful `prepareForPrint` is inherently document-generation-specific even though the returned save request does not carry that generation explicitly.

### 2. Runtime sender supplies document identity but handler drops it

For `WEBCLIP_GENERATE_PDF`, current worker code reads only:

`const tabId = sender.tab?.id`

and calls:

`generatePdfAndDownload(tabId, sanitizeContentSaveMeta(message.meta, sender), operationId)`.

The analogous Yandex flow follows the same tab-owned PDF path.

Chrome's sender includes `documentId` for content-script messages where available, but that identity is not passed into PDF generation.

### 3. Debugger target is tab-only

`generatePdfBlob(tabId)` creates:

`const debuggee = { tabId }`

and ultimately invokes `Page.printToPDF` on that browser target.

Therefore the physical renderer selected at debugger-command time is whichever document is current in the tab then, not necessarily the document whose content script completed preparation and sent the request.

### 4. `prepareForPrint()` success is not a safe commit point

Deterministic schedule:

1. top document A contains selection/print state and completes `prepareForPrint(metaA)`;
2. A sends `WEBCLIP_GENERATE_PDF`; sender identity still represents A;
3. before worker debugger attach/print, tab reloads/navigates to document B — including same-URL B;
4. worker retained only tabId;
5. debugger attaches to current B and `Page.printToPDF` renders B;
6. metadata/selection/resource report originated from prepared A while physical PDF bytes are B.

The stronger frozen-content representation required by P0-075 does not solve this by itself if the worker never proves that the debugger target is the owner of that representation.

### 5. URL equality cannot repair same-URL replacement

A fresh `tabs.get(tabId).url` check can detect ordinary cross-URL navigation but not full reload/replacement at the same URL. P0-070 therefore needs exact document/navigation generation, not only URL revalidation.

## Required P0-070 acceptance

### Prepared-generation receipt

The content preparation phase must produce/be associated with an immutable receipt binding:

- exact sender top `documentId` / navigation generation;
- admitted normalized source URL as descriptive metadata;
- selection/frozen print generation from P0-075/P0-004;
- worker-issued operation receipt P1-198.

### Worker preserves the sender identity

At runtime admission, worker captures sender.documentId and expected tab/document generation before doing any delayed PDF work. The identity must be carried through debugger/PDF generation rather than collapsed to tabId.

### Pre-debugger fence

Immediately before attach/print, prove the current top document still equals the admitted/prepared document generation. Mismatch must fail closed before `Page.printToPDF`.

If Chrome debugger APIs remain tab-addressed, use an independent exact-document/navigation receipt to prove the current tab target still belongs to A. URL-only proof is insufficient.

### Post-print / consumer admission

Once PDF bytes exist, bind them to the same document/print generation before cache/download/Yandex admission. If the tab changed during the print window and exact provenance cannot be established, do not publish a mixed A/B save.

### Diagnostics use the same generation

P1-147 before/after/post-print diagnostics must refer to this exact print/document generation or be marked unavailable. A replacement document never supplies diagnostics for A.

## Regressions

1. Prepare A -> navigate to B before debugger attach -> no PDF B under metadata A.
2. Prepare A -> same-URL reload B -> fail exact document fence despite equal URL.
3. Prepare A -> no navigation -> normal PDF succeeds.
4. Navigation during debugger/print -> post-print consumer admission detects generation mismatch according to chosen Chrome receipt model; mixed provenance is not finalized.
5. Frozen printable representation A exists but current tab is B -> B cannot become its debugger target.
6. Source A closes after already-admitted immutable PDF/download/upload generation -> physical recovery may continue from its durable receipt, but new retry/current-document authority is not transferred to B.
7. Diagnostics query after A replacement -> B diagnostics are rejected/not requested as A evidence.
8. Worker restart cannot reconstruct source document identity from tabId+URL alone for an unadmitted PDF operation.
9. Progress delivery targets/drop semantics remain exact-document under existing P1-198/P0-070 requirements.
10. No regression to debugger attach/detach actual-settlement bounds.

## Numbering result

No new item. **P0-070** remains primary owner; P0-075/P0-004/P1-198/P0-079/P1-147 compose.

## Test / release state

No product tests were rerun. Historical **88/88 JavaScript syntax + 74/74 deterministic tests PASS** remains prior evidence only. No build, tag or Release was created.

## Retired source: `RESEARCH_DELTA_PRINT_HEADER_TEXTUAL_ID_CLEANUP_2026-08-29.md`

SHA-256 of UTF-8 source text: `77b3c32c3e647184d4c9fe92be19107364c41466f54d0539cb869709f8bbe671`

# Research delta — print-header cleanup must remove the exact generated node — 2026-08-29

Baseline `main` before this write: `a7030b807da1d96e79f41bf9e15c3344f0832972`.

Docs-only research checkpoint. Runtime, manifest, tests, build, tag and Release are unchanged.

## Classification

**New P1-220 — print-header cleanup re-resolves a textual DOM id and can delete a newer host-owned replacement node.**

This is the DOM form of the architecture invariant that a fresh read by textual id is not CAS/ownership proof.

## Source proof

During PDF preparation `content.js` creates a concrete node:

```js
const header = document.createElement('section');
header.id = PRINT_HEADER_ID;
...
state.printHeader = header;
```

The state therefore has exact object identity for the generated header.

But `restoreAfterPrint()` does not remove `state.printHeader`. It does a new lookup:

```js
document.getElementById(PRINT_HEADER_ID)?.remove();
```

The page owns the same DOM and can remove, rename or replace that id while print is in progress. `getElementById()` at cleanup time only proves current string equality, not that the returned node is the one WebClip created.

By contrast, print style cleanup already iterates stored exact style object references (`state.printStyles`) and calls `style.remove()` on those exact nodes.

## Deterministic replacement schedule

1. WebClip creates header object `H1` with id `webclip-pdf-header` and appends it.
2. Host MutationObserver removes `H1` and later creates its own node `H2` with the same id, or an application rerender replaces the subtree with `H2`.
3. PDF completes/fails.
4. WebClip executes `document.getElementById(PRINT_HEADER_ID)` and receives `H2`.
5. Cleanup removes `H2`, although WebClip never created/owned that node.

No navigation, document replacement or hostile privilege escalation is required; ordinary DOM rerender is sufficient.

## Required contract

- Cleanup must operate on exact node identity captured when the temporary artifact was created, e.g. `state.printHeader` plus preparation generation.
- If the exact generated node is detached, cleanup is already complete for that node; do not search by id for a replacement.
- A newer WebClip preparation generation must have a distinct receipt so old cleanup cannot remove its node.
- Any id/name is presentation metadata only, never cleanup capability.
- Diagnostics may separately detect an unexpected same-id node, but must not delete or mutate it.

Longer-term P0-075 frozen/owned print representation should further reduce live-page temporary nodes, but exact cleanup identity remains required wherever such nodes exist.

## Required regressions

1. Exact WebClip header remains connected -> cleanup removes it.
2. Host removes exact header before cleanup -> cleanup is a no-op.
3. Host removes H1 and inserts H2 with same id -> H2 survives cleanup.
4. Host changes H1 id -> cleanup may remove H1 by object identity without touching any other same-id node.
5. G1 header replaced by G2 WebClip header -> G1 cleanup cannot remove G2.
6. Success and failure cleanup paths obey identical object-identity rules.
7. Diagnostics do not use `getElementById()` as proof of WebClip ownership.

## Duplicate check / numbering

Repository semantic search for `PRINT_HEADER_ID`, `getElementById(...).remove`, replacement-node cleanup and exact print-header ownership found no existing dedicated research owner. P0-075 owns the broader hostile/live-DOM print boundary, but not this concrete stale cleanup identity bug.

Current repository search found no `P1-220`; P1-219 is the immediately preceding newly assigned owner on current `main`. Therefore this checkpoint assigns **P1-220**.

## Validation state

Documentation only. Historical 88/88 JS syntax and 74/74 deterministic PASS were not rerun for this HEAD. Real unpacked Chrome QA remains required.

## Retired source: `RESEARCH_DELTA_PRINT_IMAGE_WRAPPER_STRUCTURAL_ROLLBACK_2026-08-29.md`

SHA-256 of UTF-8 source text: `4ea8edff3622fd88e7dea0e9dab0a5046401add6b3a6611393e7db6201d8afeb`

# Research delta — temporary PDF image wrappers need structural rollback ownership — 2026-08-29

Baseline `main` before this write: `46addbcac5fb4b6d87bcd8e92e88898c37d93480`.

Docs-only research checkpoint. Runtime, manifest, tests, build, tag and Release are unchanged.

## Classification

**New P1-219 — temporary image-link structural rollback can reparent a host node after the host has superseded WebClip's mutation.**

This is distinct from P1-218. P1-218 owns attribute compare-before-restore. P1-219 owns temporary **DOM topology** changes where WebClip moves a page-owned node and later moves it again during cleanup.

## Source proof

`content.js::wrapUnlinkedImagesForPdf()` makes an unlinked selected image clickable in PDF by inserting a temporary anchor immediately before the image and then moving the original image node inside that anchor:

```js
const nextSibling = image.nextSibling;
...
parent.insertBefore(link, image);
link.appendChild(image);
state.wrappedImages.push({ image, link, parent, nextSibling });
```

`restoreAfterPrint()` later performs unconditional topology restoration:

```js
if (image && parent) {
  if (nextSibling && nextSibling.parentNode === parent) parent.insertBefore(image, nextSibling);
  else parent.appendChild(image);
}
link?.remove();
```

There is no proof that `image.parentNode === link`, that `link` is still the exact WebClip-owned wrapper in the expected location, or that the host has not intentionally moved the image since preparation.

## Deterministic stale-cleanup schedule

1. Image `I` belongs to page parent `P`.
2. WebClip generation G inserts wrapper `W` under `P` and moves `I` under `W`.
3. A page MutationObserver/component reacts and legitimately moves the same image `I` to a new container `Q` or otherwise adopts it into newer application state.
4. PDF ends/fails.
5. G cleanup sees saved `{image:I,parent:P,nextSibling}` and moves `I` back under `P`.
6. The newer host-owned topology `Q -> I` is destroyed by stale WebClip rollback.

A same-document SPA/application generation change is not required. This can occur in one route and one browser document solely because live DOM is shared mutable state.

## Required contract

A structural rollback record must include an exact ownership receipt for the topology WebClip created. Cleanup may reverse it only when the live tree still proves that exact temporary topology, for example:

- wrapper node is the exact generated node for the active preparation generation;
- `image.parentNode === wrapper`;
- wrapper remains attached in the expected WebClip-created position/generation;
- no newer WebClip preparation generation owns the image/wrapper.

If the page has moved/adopted the image, cleanup must treat the original mutation as **superseded** and must not reparent the image. It may remove an empty still-owned wrapper if that removal cannot affect page-owned descendants/state.

Do not attempt to "repair" host topology from the pre-print snapshot after ownership was lost.

## Architectural direction

P0-075's inert/frozen WebClip-owned print representation avoids this class entirely: clone/snapshot the image into the print artifact and add PDF-only link semantics there, rather than moving the live page's image node.

Until then, live structural mutations require generation-aware compare-before-rollback just as attribute mutations require CAS.

## Required regressions

1. Image remains inside exact WebClip wrapper until cleanup -> original topology restores.
2. Host moves image from wrapper to another live parent before cleanup -> WebClip does not move it back.
3. Host removes/replaces wrapper while retaining image elsewhere -> cleanup does not adopt/reparent image.
4. Host inserts/removes original `nextSibling` -> cleanup remains ownership-based, not position-heuristic.
5. Older print generation cleanup cannot unwrap/reparent structure created by a newer print generation.
6. Failure path and success path obey the same ownership rule.
7. PDF still exposes the intended image link when the frozen/owned representation is intact.
8. Bounded diagnostics distinguish restored vs superseded structural cleanup without serializing page content.

## Duplicate check / numbering

Repository semantic search for `wrappedImages`, image-wrapper rollback, reparent/parent/nextSibling stale restore found no existing research owner. Existing P0-075 covers the broader frozen-representation direction and P0-071/P0-004 cover printable link semantics, but no existing item owns late reparenting of the live host image.

Current repository search found no `P1-219`, after P1-218 had just been assigned and committed on current `main`. This checkpoint therefore assigns **P1-219**.

## Validation state

Documentation only. Historical 88/88 JavaScript syntax and 74/74 deterministic tests remain prior evidence only and were not rerun for this HEAD.

## Retired source: `RESEARCH_DELTA_PRINT_PREPARATION_PAGE_CONTROL_ACTIVATION_2026-08-28.md`

SHA-256 of UTF-8 source text: `2f2dd35c413eb32ed22ecc5a6cf7a20e46c368dd9f9e30ef52021b70e966d0c1`

# Research delta — print preparation must not activate page-owned controls — 2026-08-28

Docs-only research checkpoint. Runtime/config/manifest/tests are unchanged.

## Classification

**New P1-212** — PDF/print preparation must not synthesize activation of page-owned controls merely to reveal accordion/spoiler content.

This composes with **P0-070** document-generation fencing, **P0-075** hostile/shared-DOM trust, **P0-004** frozen print fidelity and the existing resource/print preparation requirements, but it is a distinct side-effect root cause: WebClip itself invokes arbitrary page behavior during an operation the user authorized only as “save/print”.

## Source proof

`prepareForPrint(meta)` calls:

`await expandSpoilersInIncludedContent()`

before PDF generation.

For non-native disclosure UI, `expandSpoilersInIncludedContent()` discovers controls by broad semantic/heuristic markers such as:

- `[aria-expanded="false"]`;
- `[aria-controls]`;
- `data-bs-toggle` / `data-toggle`;
- spoiler/accordion/collapse classes.

After resolving a panel, it calls `isSafeDisclosureControl(control, panel)` and then:

```js
const clicked = triggerInternalClick(control);
```

`triggerInternalClick()` executes:

```js
control.click();
```

The `state.internalInteraction` flag only prevents WebClip's own page-selection click handler from treating this activation as a user selection. It does **not** suppress the target page's event listeners or browser default action.

## The current “safe” predicate is not a side-effect proof

### Anchors

For an `<a>`, a non-fragment `href` is rejected only when the element lacks semantic toggle markers.

Therefore an anchor like:

```html
<a href="https://example.test/action" aria-controls="panel" aria-expanded="false">...</a>
```

passes the semantic-toggle rule and WebClip calls `.click()` on it.

The page handler may reveal a panel, but the anchor's default navigation is also eligible to run unless the site itself prevents it.

### Submit buttons

A `<button type="submit">` is rejected only if it lacks the same semantic-toggle markers.

A submit button with `aria-controls`/`aria-expanded` therefore passes and `.click()` can submit its owner form in addition to executing page listeners.

### Arbitrary listeners

Even an otherwise harmless-looking `<button type="button" aria-controls="panel">` can have arbitrary site listeners attached. WebClip has no authority proof that those listeners are disclosure-only.

The page can update account state, start network requests, delete/edit content, navigate, open dialogs or execute any other page-origin behavior from that activation.

## Why this is not solved by `Event.isTrusted`

Programmatic `.click()` is intentionally the problem. Whether the resulting event reports trusted/untrusted status does not make execution safe:

- ordinary page listeners normally receive and may act on synthetic click events;
- browser default activation behavior for `.click()` can still apply;
- a cooperative framework may intentionally use synthetic activation;
- WebClip cannot inspect arbitrary listeners to prove they are read-only.

The safe contract is to avoid page-owned activation as a print-preparation primitive.

## Deterministic failure schedules

### Navigation

1. User selects content containing an accordion-like anchor.
2. Anchor has `aria-controls` and a normal HTTP(S) `href`.
3. User clicks WebClip “save”.
4. `expandSpoilersInIncludedContent()` classifies the anchor as a disclosure control.
5. WebClip invokes `control.click()`.
6. Site listener may run and the anchor may navigate the document.
7. The PDF operation is now racing document replacement; P0-070 must later fail closed, but the unintended navigation has already happened.

### Form submission

1. A form's submit button also carries accordion/toggle ARIA metadata.
2. The selected region contains that button/panel.
3. Print preparation invokes `.click()`.
4. Form submission/site mutation occurs without a user gesture authorizing that site action.

### Arbitrary handler

1. A page element looks like a disclosure button and points to a real panel.
2. Its click listener both opens the panel and performs another state-changing action.
3. WebClip's save operation triggers both.

No malicious extension API access is required for these failures; the defect is the extension causing unrelated page-side effects during a capture operation.

## Required contract

### Native structural disclosure

Native `<details>` may be copied/rendered open through a WebClip-owned representation or otherwise have its `open` state handled structurally, without clicking its `<summary>`.

### Third-party accordion/spoiler

Do not call page-owned `.click()`, `dispatchEvent()` or equivalent activation merely to prepare PDF content.

Acceptable approaches include:

1. resolve the associated panel and make **the frozen print representation** visible without mutating/activating the live page;
2. copy already-present hidden panel DOM into the frozen representation and normalize its print styles there;
3. if content exists only after site JavaScript loads it on activation, leave it closed/omitted with clear diagnostics rather than causing an unapproved site action;
4. optionally expose an explicit user-controlled page interaction outside the save operation if product UX later chooses to support that behavior.

The extension must not infer “safe to activate” from ARIA/classes alone.

## Relationship to frozen representation

P0-004/P0-075 already require a WebClip-owned frozen print generation. That architecture is also the natural repair here:

- disclosure normalization belongs in F, the captured representation;
- F can make an existing hidden panel printable without firing live page listeners;
- subsequent host mutations cannot retarget the representation;
- save remains observational/capture-oriented instead of becoming a generic page-action runner.

## Regression cases

1. `<a href="/next" aria-controls="p" aria-expanded="false">` inside selection -> PDF preparation never navigates.
2. Same anchor with site click listener -> listener is not invoked by WebClip.
3. `<button type="submit" aria-controls="p">` -> form is never submitted by print preparation.
4. `<button type="button">` with arbitrary side-effect listener -> listener is not invoked.
5. Native `<details>` closed -> frozen PDF may render its content according to product policy without click activation.
6. Bootstrap/custom accordion with panel already present but CSS-hidden -> frozen representation can expose panel without executing site handlers.
7. Accordion whose body is created only after a page-owned click -> save stays bounded and reports/accepts unavailable dynamic content; it does not click.
8. P0-070 document generation remains unchanged during print preparation because WebClip itself does not initiate navigation.
9. Normal selected content without disclosures produces the same PDF behavior.
10. Hostile page adding fake `aria-controls`/accordion classes cannot turn WebClip save into a synthetic click primitive.

## Numbering result

**P1-212 is assigned to this root cause.**

P0-075 remains the hostile page/WebClip control-plane owner, P0-070 remains the exact-document PDF owner, and P0-004 owns fidelity of the frozen representation. P1-212 specifically prohibits unapproved page-owned activation during print preparation.

## Validation note

Documentation only. Product tests were not rerun; historical 88/88 JavaScript syntax + 74/74 deterministic PASS remains prior evidence only. Browser regressions are required for anchor default navigation, form submission and arbitrary click listeners. No build, tag or Release was created.

## Retired source: `RESEARCH_DELTA_PRIVACY_PRINT_BOUNDARY_2026-08-27.md`

SHA-256 of UTF-8 source text: `8fb6462d28db461df9e478c69e1c8de55f436cafcc040a4e9812868f3eb62470`

# URL privacy / flattened print boundary research delta — 2026-08-27

Baseline source HEAD: `6552f53f684636ae188320aa075bea850850d0be`.

This is a lossless research checkpoint against existing P0 items. It is not a canonical registry replacement and does not assign a new P-number. Production/runtime/config/manifest are unchanged by this commit.

## Existing P0-066 refinement — source/import URL paths still lack the canonical confidentiality sanitizer

Fresh review confirms that OperationLog has a useful independent redaction layer, but the durable product metadata path still has the P0-066 gap.

### Live save metadata

`sanitizeContentSaveMeta(rawMeta, sender)` obtains the authoritative tab URL from `sender.tab.url`/`sender.url`, requires HTTP/HTTPS, and returns:

- `hostname = parsed.hostname`;
- `siteAddress = parsed.origin`;
- `url = parsed.toString().slice(0, MAX_IMPORTED_URL_CHARS)`.

The `url` field therefore keeps URL userinfo, query and fragment when those components are present in the authoritative source URL. It is later eligible for Journal/export/Yandex backup and participates in PDF/header semantics elsewhere in the current pipeline.

### Imported HTTPS metadata

`normalizeImportedHttpsUrl(value)` validates only that `new URL(raw).protocol === 'https:'` and then returns `url.toString()`. It does not reject or remove username/password. This reconfirms the imported/public URL portion already explicitly required by P0-066.

Required P0-066 contract remains one shared sanitizer/policy rather than piecemeal string handling:

- reject/remove URL username/password before any durable/display use;
- remove fragment for durable identity unless an explicit feature proves it is needed;
- redact/drop known credential-like query parameters while preserving accepted non-secret query semantics;
- distinguish durable public links from arbitrary imported HTTPS URL text and reject malformed/non-approved public-link authority;
- use the same canonical representation for Journal/export/backup/PDF display decisions that require confidentiality consistency.

Do not silently substitute OperationLog redaction as a fix for the Journal/PDF path: logs and product metadata have different consumers and lifetimes.

## Positive finding — OperationLog already applies stronger generic URL redaction

Fresh `sanitizeOperationLogValue()` review shows that strings are independently sanitized before durable diagnostics:

- OAuth/Bearer credential text is redacted;
- common token/signature query assignments are redacted;
- any HTTP(S) URL found inside a string is re-emitted as `url.origin + url.pathname`, with the whole query replaced by `?[REDACTED_QUERY]` and fragment omitted;
- signed `disk.yandex.net` URLs are reduced further to `origin/[REDACTED_SIGNED_PATH]`;
- URL-like fields receive the same structural rewrite.

Using `url.origin` also removes URL username/password. Therefore this block does **not** add an OperationLog leak to P0-066.

Regression should nevertheless keep this property when the canonical P0-066 sanitizer is introduced: diagnostic redaction must not accidentally become weaker simply because source URLs gain a shared product sanitizer.

## Existing P0-068 refinement — flattened same-origin proxy actively copies network-bearing URL state

Fresh `content.js` review confirms the P0-068 active-DOM concern with concrete network behavior.

`createFlattenedBodyFramePrintProxy(frame, sourceBody)`:

1. creates a live `<section>` in the top document;
2. clones every `sourceBody.childNode` with `cloneNode(true)`;
3. builds source/target descendant arrays and copies selected computed style/URL state;
4. removes `<script>` elements and WebClip Exclude subtrees;
5. mounts the proxy as a top-document-body print representation and hides the original iframe.

The sanitizer does **not** remove/neutralize nested `iframe`, `frame`, `object`, `embed`, forms, custom elements or duplicate document identity (`id`/`name`) before live insertion. That is the existing P0-068 root cause.

Fresh evidence makes the network part explicit: `copyFrameCloneUrlState(source,target)` handles images by taking `source.currentSrc || source.src` and assigning that absolute URL to the cloned target `src`, while removing `srcset/loading`. Thus insertion of the top-document proxy can initiate a new image request even though the source image had already existed inside the child browsing context. Clone insertion can likewise activate the already documented nested browsing/plugin/custom-element semantics.

Required extension of P0-068:

- sanitization/inert transformation must happen **before** any cloned subtree is connected to the live top document;
- nested browsing/plugin contexts must become inert printable placeholders/static representations rather than live `iframe/frame/object/embed` nodes;
- custom elements must not execute page-defined lifecycle callbacks merely because WebClip prepares a PDF;
- form/navigation/autofocus/identity semantics that can cause behavior or interfere with the host top document must be neutralized;
- duplicate `id/name` and similar document-global identity must not be mounted unchanged;
- network-bearing image/media/resource attributes need an explicit print policy: preserve visual content without creating uncontrolled duplicate network side effects at proxy mount. If already-decoded renderer content cannot be reused safely, bounded prefetch/failure semantics should be explicit rather than hidden clone-triggered fetches.

P0-071 remains the separate PDF clickable-URI scheme boundary: a cloned link becoming printable/clickable must still obey the safe-scheme policy. P0-068 owns the live proxy side effects caused by mounting the representation.

Required regressions:

1. Same-origin selected-body iframe containing nested iframe/object/embed/custom element: preparing PDF does not create a new browsing/plugin context and does not call page custom-element `connectedCallback` from the proxy.
2. Source image whose server counts requests: proxy preparation does not silently produce an extra uncontrolled request; visual print behavior remains defined.
3. Duplicate `id/name` inside child iframe does not collide with top-document identity during proxy lifetime.
4. Scripts remain removed and Exclude semantics remain unchanged.

## Number allocation

No independent root cause was found in this block. **P0-079, P1-197 and P2-020 remain unassigned.** P1-195/P1-196 remain evidence-reserved in the OAuth checkpoint.

## Test / release evidence

Research documentation only. Product runtime/configuration and `manifest.json` are unchanged. Product tests were not rerun; the earlier `88/88 syntax + 74/74 deterministic PASS` remains historical evidence only.

## Retired source: `RESEARCH_DELTA_RESOURCE_PREFETCH_ROLLBACK_REMOTE_FRAME_PARITY_2026-08-29.md`

SHA-256 of UTF-8 source text: `92717e831221c6e05d5acce264ca975d10f81eeb49de0116a6c067eff81ec4b3`

# Research delta — P1-218 remote-frame resource rollback parity — 2026-08-29

Baseline `main` before this write: `41b24308d70a16d93faa63a0933d5991f3615688`.

Docs-only research checkpoint. Runtime/tests/manifest/build/release are unchanged.

## Classification

**Extend existing P1-218; no new P-number.**

The same compare-before-restore defect confirmed in top-frame `content.js` also exists independently in cross-origin `frame-agent.js`.

## Source proof

`frame-agent.js::prefetchSelected()` temporarily mutates selected image attributes:

- missing `src` may be populated from `data-src`;
- `loading="lazy"` is changed to `loading="eager"`;
- `rememberAttr()` records prior state in `state.changedAttrs`.

`restorePrint()` later does:

```js
for (const x of state.changedAttrs.reverse()) {
  try {
    x.had ? x.el.setAttribute(x.name, x.value ?? '') : x.el.removeAttribute(x.name)
  } catch (_) {}
}
```

There is no comparison against the temporary value WebClip itself wrote. A page script in that child document can therefore change `src`/`loading` after prepare, and late restore will overwrite the newer page-owned value with the pre-prepare snapshot.

## Boundary vs P1-214

`P1-214` owns the top↔remote-frame prepare/restore saga and exact rollback settlement receipt: which child generation was prepared, whether restore was sent/acknowledged, and what remains unresolved.

That does not prove authority for each DOM write **inside** the child. Even a restore RPC delivered to the exact correct child document can still be a stale writer with respect to newer host-page mutations in that same document.

Therefore remote-frame cleanup needs both:

1. P1-214 exact child prepare/restore settlement ownership; and
2. P1-218 compare-before-restore ownership for temporary resource attributes.

## Required regression parity

1. Child image has no `src`; WebClip copies `data-src`; child app writes a different `src`; restore leaves child app value.
2. Child `loading=lazy` -> WebClip `eager`; child changes/removes it; restore does not resurrect `lazy` over newer state.
3. Exact temporary value still present -> original value/presence restores normally.
4. Old child prepare generation restore cannot touch a new child document generation under P1-214.
5. Correct child generation but host superseded the attribute -> P1-218 marks cleanup `superseded-by-host`, not failure.

## Duplicate check

Repository research map already contains P1-214 for remote-frame restore settlement and the immediately preceding P1-218 delta for resource rollback ownership. No separate owner is warranted; this is execution-context parity of the same root cause.

## Validation state

Documentation only. Historical 88/88 syntax and 74/74 deterministic test results were not rerun for this HEAD.

## Retired source: `RESEARCH_DELTA_RESOURCE_PREFETCH_ROLLBACK_STALE_HOST_MUTATION_2026-08-29.md`

SHA-256 of UTF-8 source text: `9674f85ab0ff9617d79cc34fdfa2733ae34f46e3776b29fa2b8cbb64893c0e1f`

# Research delta — resource-prefetch rollback must not overwrite newer host DOM — 2026-08-29

Baseline `main` before this write: `e19853efa10e8be3863ad8001348a395e5b3bb18`.

Docs-only research checkpoint. Runtime, manifest, tests, build, tag and Release are unchanged.

## Classification

**New P1-218 — temporary resource-prefetch rollback is an unfenced stale writer.**

`P1-003` already owns bounded renderer-side prefetch and the requirement to restore temporary `src` / `srcset` / `loading` mutations after print. This delta does not duplicate that owner. It adds the missing ownership/CAS rule for rollback itself: WebClip must restore an attribute only if the live DOM still contains the exact temporary value written by the same preparation generation.

## Source proof

`content.js::rememberResourceAttribute()` stores only the pre-WebClip state:

```js
state.changedResourceAttributes.push({
  element,
  name,
  had: element.hasAttribute(name),
  value: element.getAttribute(name)
});
```

`setTemporaryResourceAttribute()` then writes the print-preparation value, for example:

- `loading="lazy"` -> `loading="eager"`;
- `data-src` -> `src`;
- `data-srcset` -> `srcset`.

At cleanup, `restoreAfterPrint()` iterates the remembered records and unconditionally restores the old value or removes the attribute:

```js
if (had) element.setAttribute(name, value ?? '');
else element.removeAttribute(name);
```

The record does **not** retain the exact temporary value WebClip wrote, an ownership token, or a preparation generation. Cleanup therefore cannot tell whether the current attribute is still WebClip-owned.

## Deterministic stale-rollback schedule

1. Host image starts with `loading="lazy"` and `src="preview-A.jpg"`.
2. WebClip print generation G remembers those values and promotes resource attributes, e.g. writes `loading="eager"` and `src="full-A.jpg"`.
3. While print preparation/rendering is in progress, the SPA/lazy-loader legitimately advances the same live image to `src="full-B.jpg"` and perhaps changes/removes `loading`.
4. PDF generation finishes or fails.
5. `restoreAfterPrint()` for G writes the **old pre-G** values back.
6. The newer page-owned state B is lost even though WebClip no longer owns the current attribute value.

This remains possible when the browser document and SPA route are unchanged; therefore `P0-080` application-generation fencing alone does not solve it.

## Why this is distinct from existing print-side-effect owners

- `P1-003` owns bounded resource prefetch and basic rollback presence.
- `P0-067/P1-212` own page-control activation during print prep.
- `P0-071/P0-075` own frozen printed representation / hostile-page TOCTOU.
- `P1-218` owns **rollback write authority on mutable host attributes** after WebClip temporarily changed them.

The existing research note that resource prefetch mutates live host DOM established the side effect; it did not establish a compare-before-restore contract. Here the corruption mechanism is specifically the late rollback overwriting a newer host mutation.

## Required contract

Each temporary mutation record must capture at least:

- element identity within the accepted document/application generation;
- attribute name;
- original `{present,value}`;
- exact temporary `{present,value}` written by WebClip;
- print/preparation generation or equivalent ownership receipt.

Rollback must be compare-and-restore:

1. verify the cleanup still belongs to the active/completing preparation generation;
2. read the live attribute immediately before rollback;
3. restore/remove only if live `{present,value}` exactly equals the temporary value written by that generation;
4. if the host changed it, leave the host value untouched and record bounded diagnostic `rollback-superseded` rather than treating cleanup as failure;
5. stale cleanup from an older print generation must never modify values owned by a newer WebClip preparation generation.

This is the DOM analogue of CAS: a fresh read of the element is not enough if the read is used to overwrite a value that no longer matches the write being rolled back.

## Architectural direction

The stronger `P0-075` direction — prepare an inert/frozen WebClip-owned print representation instead of mutating live page resources — naturally eliminates most of this rollback authority. Until that boundary exists, live-DOM temporary writes require explicit write receipts and compare-before-restore semantics.

The same invariant should be applied to any other temporary host-DOM mutation that is later restored from a saved pre-value. Do not automatically merge unrelated mutations into P1-218; classify separately when their authority/lifecycle differs.

## Required regressions

1. WebClip changes `loading=lazy` to `eager`; host changes it to another valid state before cleanup -> WebClip leaves host state untouched.
2. WebClip promotes `data-src` into `src`; host replaces `src` before cleanup -> old `src` is not resurrected.
3. WebClip promotes `srcset`; host replaces `srcset` -> host value survives.
4. Attribute originally absent, WebClip adds temporary value, host writes a different value -> cleanup does not remove it.
5. Attribute remains exactly equal to WebClip temporary value -> exact original state is restored.
6. Failed print path applies the same compare-before-restore rule.
7. Generation G1 cleanup occurring after G2 wrote its own temporary value cannot restore G1 original over G2.
8. Detached/replaced element is not used as authority for a new live DOM node; cleanup is bounded and harmless.
9. Existing P1-003 prefetch success/failure/resource budgets remain unchanged.
10. Operation diagnostics distinguish `restored`, `superseded-by-host`, and genuine rollback failure without persisting sensitive resource URLs.

## Duplicate check / numbering

Before assigning a number, current `main` registry/handoff and repository research files were checked semantically for `changedResourceAttributes`, resource-attribute rollback ownership, concurrent host mutation and stale prefetch restore. Existing material covers resource prefetch side effects and rollback existence, but no owner was found for compare-before-restore of those attributes. Current handoff names P1-217 as the newest assigned P1 owner, and `P1-218` was not found in the current repository search.

Therefore this checkpoint assigns **P1-218**.

## Validation state

Documentation only. Historical **88/88 JS syntax + 74/74 deterministic tests PASS** remain historical evidence and were **not rerun** for this current HEAD. Real unpacked Chrome QA remains a release requirement.

## Retired source: `RESEARCH_DELTA_SPA_SAME_DOCUMENT_SELECTION_GENERATION_2026-08-28.md`

SHA-256 of UTF-8 source text: `f7f24e987ca68aafdf6cb45b42436d407db4b456fea00f9ac9d81f5420b2f372`

# Research delta — SPA / same-document selection generation authority — 2026-08-28

Source-of-truth `main` immediately before this write: `1eeb997ac062e7f5af67a5108c9907b04a538497`.

Docs-only research checkpoint. Runtime, tests, configuration and `manifest.json` are unchanged.

## New confirmed item: P0-080

**P0-080 — WebClip selection authority can survive same-document SPA/history navigation after the selected DOM has been replaced. The content script stores Includes/Excludes as direct element references and counts Map entries regardless of `isConnected`; it has no History API/popstate generation fence or general selection-pruning observer. A SPA route can therefore detach all selected elements while WebClip still reports non-zero Includes. A subsequent save uses the new current URL/title but stale detached selection state, allowing blank/mismatched PDF/Journal output under the new route.**

This is distinct from P0-070/P0-023 full-document identity: `MessageSender.documentId` may legitimately stay unchanged during `history.pushState()`/`replaceState()`/hash/popstate navigation.

## Source proof

### Selection is object-reference state

`content.js` keeps local selection in:

- `state.includes = new Map()`;
- `state.excludes = new Map()`.

The maps contain actual page `Element` objects.

`totalIncludeCount()` currently returns:

`state.includes.size + totalRemoteIncludeCount()`

It does not require local elements to remain connected to the current document.

### Rendering already knows disconnected elements are possible

Several visual helpers explicitly test `element?.isConnected`. For example outline rendering simply returns when a selected element is disconnected.

That is useful defensive rendering, but it means a stale selection can become **invisible without being removed from selection authority**:

- count can remain non-zero;
- save/review commands can still pass their `totalIncludeCount()` gate;
- the user may no longer see the stale outline that explains what WebClip thinks is selected.

Ad-suggestion cleanup prunes disconnected suggestions, and remote-frame handling checks connected frame elements, but there is no equivalent authoritative pruning for `state.includes` / `state.excludes`.

### No same-document navigation generation is tracked

Fresh research found no content-side `popstate` listener, History API generation wrapper, or general MutationObserver that invalidates/revalidates selection when a SPA replaces its route content.

Because `content.js` is a singleton in the same document, a normal `history.pushState()` or `replaceState()` does not reload the content script. Its in-memory maps therefore survive.

### Save metadata is current while selection may be old

Current worker-side P0-030 normalization correctly treats `sender.tab.url` as authoritative save URL. Content metadata also naturally observes current `location.href` / title.

That is a positive trust-boundary control, but in this scenario it creates a mixed generation:

- URL/title = current SPA route B;
- selection references = old route A detached DOM;
- `documentId` = same browser document for A and B.

P0-070's exact documentId fence cannot distinguish those application generations.

### Snapshot generation does not repair the authority

`serializeSelectionSnapshot()` iterates the current maps and calls `createElementLocator()` for each element. A detached old element still has object/text/attribute state and an `ownerDocument`, so serialization is not itself proof that the element belongs to the live current route representation.

Structural paths for a detached subtree can also degrade or cease to describe the current body. Persisting such a locator under route B makes later restore semantics misleading.

## Deterministic SPA schedule

1. User is on SPA route A at `https://example.test/item/a`.
2. WebClip selects live element `EA`; `state.includes.size === 1`.
3. The application calls `history.pushState(..., '/item/b')` and replaces the route root. `EA` becomes disconnected.
4. The content script remains loaded because this is same-document navigation.
5. No WebClip generation change/pruning runs; `state.includes.size` is still 1.
6. Outline rendering silently skips disconnected `EA`, so visible selection can disappear while count/authority remains.
7. User/context-menu invokes Download/Yandex/Finish.
8. Gate sees `totalIncludeCount() > 0` and admits save.
9. Current metadata/sender URL identifies route B.
10. Selected-only print machinery operates on current live document B, while WebClip's local Include marker lives on detached `EA` from A.
11. Output can be empty/partial or otherwise not represent the selection the user authorized, and Journal metadata/snapshot can be associated with B.

This is a correctness/data-integrity problem, not only an outline UX issue.

## Same URL DOM replacement is also relevant

A SPA or hostile page can replace a selected subtree without changing `location.href` at all.

Therefore a URL/history generation signal is necessary but not sufficient. Immediately before destructive/save admission, WebClip must also prove that every authoritative selected local element is still connected to the expected live document/tree.

Disconnected Includes must never count toward the minimum-one-Include save precondition.

## Required P0-080 contract

### Application/navigation generation

The content command/session model needs a bounded same-document application generation receipt. At minimum, WebClip should observe route changes that alter navigation identity, including:

- History API `pushState` / `replaceState`;
- `popstate`;
- hash/navigation changes according to the chosen product URL-identity policy.

A route generation change must either:

1. explicitly invalidate/clear selection and cached save authority; or
2. revalidate the whole selection against the new route and require explicit user reconfirmation before save.

Silently carrying old route selection into a new route is not acceptable.

### Live-selection validation before review/print/save

Immediately before `finish`, `download`, `yandex`, `read-later`, template-derived save and other save admissions:

- prune or reject disconnected local Includes/Excludes;
- verify selected elements belong to the current expected document/frame generation;
- refresh/reconcile remote-frame selection under P1-171;
- require at least one **live** Include after validation;
- if stale entries were removed, surface an explicit message rather than saving a blank representation.

The same validation must run again at the frozen print-representation boundary required by P0-075/P0-071 so host mutation cannot invalidate the accepted selection between UI confirmation and print.

### Interaction with URL/document owners

- **P0-070** still owns full-document generation from content command through `Page.printToPDF` and finalization.
- **P0-023** still owns exact retry-cache document identity/invalidation.
- **P1-171** owns cross-origin child document generation.
- **P0-080** owns the narrower but independent case where browser `documentId` is unchanged while SPA/application representation and selected DOM generation changed.
- **P0-004/P1-001** remain selected-content output and snapshot locator semantics.

## Required regressions

1. Route A selection -> `pushState` route B + old subtree removed -> save is blocked/selection invalidated; no blank B PDF is created.
2. Route A -> route B while selected node remains live intentionally -> chosen product policy either re-confirms/rebinds or invalidates; no silent authority carry-over.
3. Same URL, selected element is removed/replaced -> stale element is pruned before save and cannot satisfy Include count.
4. All local Includes disconnected, remote Include remains valid -> only verified remote selection may keep save enabled.
5. Local iframe selected element -> iframe same-document/remount generation changes -> stale child element does not remain authoritative.
6. `popstate` back to a previous route does not automatically resurrect an old in-memory selection without explicit verified generation semantics.
7. `replaceState` URL change is treated consistently with `pushState` under the URL-identity policy.
8. Hash-only navigation follows one documented rule and does not create accidental mismatch between metadata URL and selection authority.
9. A page removes selected nodes after review but before print -> final live/frozen representation validation fails closed under P0-080/P0-075 rather than producing blank output.
10. Ordinary static page with connected selection remains unaffected.
11. SelectionSnapshot written after navigation contains only elements proven live for the accepted current application generation.
12. PDF retry cache remains independently fenced by P0-023; fixing selection generation does not make an old cached PDF valid for a new route.

## Duplicate check / numbering

Repository commit search for `SPA`, `same-document navigation`, and `selection navigation` found no existing research checkpoint assigning this root cause. Canonical priorities contain no `P0-080` assignment, and GitHub commit history contains no `P0-080` assignment.

The issue cannot be reduced to P0-070 because the browser document itself may be unchanged. It cannot be reduced to P1-001 because locator quality after an intentional restore is different from stale live selection authority before save.

This checkpoint therefore assigns **P0-080**.

## Test / release state

Documentation only. Product tests were not rerun. Historical product gate remains **88/88 JavaScript syntax + 74/74 deterministic tests PASS**. Runtime version remains `0.9.8`; no build, tag or GitHub Release was created.

## Retired source: `RESEARCH_DELTA_SPA_SAVE_CONFIRMATION_GENERATION_2026-08-28.md`

SHA-256 of UTF-8 source text: `4957357bac37fd37b1e6a25681a4952be2b1f4b99bcd95a5e43f26e2edc897ef`

# Research delta — Save confirmation must remain bound to SPA/application generation — 2026-08-28

Source-of-truth `main` immediately before this write: `0baaa84eaa34e4b1eac73ee308e0caffa83faf5c`.

Docs-only research checkpoint. Runtime/tests/configuration/manifest are unchanged. No new P-number is assigned.

## Classification

Primary owner: **P0-080 — same-document SPA/application-generation selection authority**.

Adjacent:

- P0-075 — frozen printable representation after user authorization;
- P0-070 — exact browser document generation across content/worker/print handoff;
- P1-157/P1-210 — truthful user-operation settlement and retry semantics.

## Fresh source proof

`showFileCommentDialog()` creates a long-lived user confirmation surface. The Proceed handler does not carry any route/application-generation receipt captured when the dialog was opened. It simply reads the comment and later calls `downloadPdf()` / `sendPdfToYandex()`.

`downloadPdf()` then calls `buildSaveMeta(...)` **at Proceed time**. Thus metadata is intentionally fresh at the moment of final action.

That is normally useful, but under P0-080 it can create a mixed-generation operation:

- selection/review decision was made while SPA route A was visible;
- the same browser document performs `pushState()`/`replaceState()`/`popstate` to route B while the modal remains open;
- old selected Element references from A can remain in `state.includes` even when detached;
- user presses Proceed on the still-open A confirmation;
- `buildSaveMeta()` observes current route/title B;
- save/print operation is admitted from the old dialog without proving that its selection/review generation is still current.

The user confirmation is therefore itself an authority object whose lifetime can cross an application-generation change.

## Deterministic schedule

1. Route A is current and selection EA is live.
2. User opens Download/Yandex comment/confirmation dialog.
3. Dialog content visually represents the operation the user initiated on A.
4. Page performs same-document navigation A -> B and replaces the route subtree.
5. Content script remains loaded; dialog remains open because it belongs to the extension shadow UI.
6. No route-generation receipt invalidates the modal.
7. User presses Proceed.
8. `buildSaveMeta()` now observes B, while the old selection/review authority may still refer to A.
9. WebClip can create a B-labelled save from an A-authorized/stale selection state.

This is distinct from a route change that occurs before the user opens the dialog: the confirmation itself crossed the generation boundary.

## Required P0-080 refinement

A save/review/confirmation dialog must capture an immutable expected application-generation receipt when it is opened, including enough information to prove at Proceed time that:

- current browser document generation is unchanged under P0-070;
- current SPA/history/application generation is the same as the one reviewed;
- all authoritative selected local elements are still connected and belong to that generation;
- remote child-frame selections remain valid under P1-171;
- the URL/title metadata generation matches the reviewed selection generation.

On any mismatch:

- invalidate/close the stale confirmation;
- do not silently rebuild metadata for a newer route;
- return the user to selection/review with an explicit stale-page message;
- require a fresh confirmation.

The same rule applies to retry buttons that reuse old `options` after an error: retry may reuse user-entered comment/options, but it must not reuse stale page/application authority without revalidation.

## Composition with frozen print representation

P0-080 validation at Proceed time is necessary but not sufficient. After Proceed, P0-075 still requires the actual printable representation to be frozen/verified so host DOM mutation cannot alter the accepted content before `Page.printToPDF`.

The intended chain is:

`selection generation -> review/confirmation receipt -> Proceed generation check -> frozen printable generation -> exact document PDF receipt`.

No step may silently rebind to a newer route merely because the same browser document remains alive.

## Required regressions

1. Open save dialog on A -> no navigation -> Proceed succeeds normally.
2. Open dialog on A -> `pushState` B -> Proceed is rejected as stale before PDF/Yandex/local side effect.
3. Open dialog on A -> same URL but selected subtree is replaced -> Proceed fails live-selection validation.
4. Open dialog on A -> route B -> back to A via `popstate` -> old dialog is not automatically resurrected as current; require fresh confirmation unless an exact application-generation receipt proves equivalence by design.
5. Comment text entered before invalidation may be preserved as UI draft, but it cannot preserve stale save authority.
6. Retry after a PDF/Yandex error must revalidate current application generation before reusing old options.
7. P0-070 full-document replacement and P0-080 same-document route replacement both invalidate stale confirmation, through their respective generation receipts.

## Duplicate check

The existing P0-080 delta proves stale selection survival across SPA navigation. Repository search found no dedicated checkpoint for the **confirmation lifetime** crossing the same application-generation boundary. This file is therefore an acceptance refinement of P0-080, not a new item.

## Test / release state

Documentation only. Product tests were not rerun. Historical evidence remains **88/88 JavaScript syntax + 74/74 deterministic tests PASS**. Runtime version remains `0.9.8`; no build/tag/Release was created.

