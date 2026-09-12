# P1-221 — private link rollback, raw attribute identity and cleanup isolation

Research started: 2026-09-11; delivery continued: 2026-09-12. Owner: **P1-221, ACTIVE**. Research only.
Canonical baseline: `101ea641d7ef25387665bd9601d412090e033bf6`.

## Baseline and bounded research question

Fresh main, current Registry, open PRs/issues, relevant branches and tracked tree were inspected. No open PR/issue required continuation and no tracked AGENTS.md was present. Current requirements, rationale, architecture, comprehensive research policy, change workflow and consolidated PDF/print family evidence were reread. Previously read navigation, coverage and fidelity context remains applicable to this unchanged runtime. This is a bounded refinement of C37 rollback/convergence and link representation with C46 external comparison, not project-wide research completion or coverage closure.

P1-221 already owns private link-normalization rollback authority and exact temporary value/generation. The family evidence contains the original 2026-08-29 root cause. Historical branch `research/p1-221-link-rollback-authority-2026-09-08`, exact head `804e3b3770739726b4978c0b8960ed74cb31e4e3`, is provenance only: 3 ahead / 57 behind main, merge base `d4f5b268fa3f7ced5a7bc68da52784863d614138`. None of its three files or commits is imported. Its automatic generation-takeover suggestion is refined below to strict settlement before new admission, consistent with the recent P1-199/P1-218 work.

Question: can current normalization and cleanup preserve the page's newer link attributes, retain an authoritative original value through partial failures, and allow independent cleanup to converge? Required evidence here is current-source execution plus a deterministic contract model. Full browser/PDF acceptance remains a later implementation gate. Two research files, one exact-head CI and one post-merge CI fit this tranche's delivery envelope.

## Requirements and current implementation

USER_REQUIREMENTS.md preserves link semantics in the printable representation, including existing image links and the metadata URL. DECISIONS_AND_RATIONALE.md and ARCHITECTURE.md require generation-owned temporary mutations and compare-before-restore. A successful PDF does not authorize stale writes to the live page afterwards. P0-071 owns printable URI semantics; P0-075 owns the preferred frozen/inert representation.

Current `content.js` blob: `f3ee7b51fe9ee94fdfe36e8a7c99f14a548fdc4e`. Current `frame-agent.js` blob: `ce55145dc7ee1a4abf485b7fad3134ac39b61751`.

| Current source | Positive behavior | Remaining gap |
|---|---|---|
| content.js:3984–3998, absolutizeLinksInIncludedContent | Collects selected a[href]/area[href], uses a Set and retains exact link objects. Reads original raw href and resolves link.href. | Resets the list, stores original in a mutable DOM marker, writes href, then appends only the node. No private original/temporary pair, generation or pending record. |
| content.js:4351–4357, link cleanup | Iterates exact saved objects and skips disconnected nodes. | Restores from the current marker without comparing live href; removes marker unconditionally. Reads/writes can throw out of the entire loop. Disconnected receipts are later cleared. |
| content.js:4361 onward | Header and style cleanup follows link cleanup. | An uncaught link/marker exception prevents reaching this later cleanup. |
| ABS_HREF_ATTR references in current runtime | Marker is confined to its declaration, normalization and restoration in content.js. | No print-CSS consumer of this marker was found; removing it from a future implementation is a viable simplification. |

frame-agent.js has no corresponding changedLinks/ABS_HREF_ATTR/absolutizeLinks function. This pass does not claim a mirrored child-agent link defect from the top-content proof. Same-origin selected elements collected by content.js and remote representation/link fidelity still need applicable browser tests.

## Executed current-source findings

The companion script extracts and executes the actual normalizer plus link-to-header/style cleanup slice in node:vm. A minimal link double implements raw attributes, resolved href through Node's URL API, document identity/connectivity and injected failures. Selection discovery and unrelated header behavior are stubbed. This is source control-flow evidence, not a full DOM, Chromium run or incident prevalence measurement.

Ten named current-gap checks demonstrate:

1. A newer host href is overwritten with the old marker value.
2. Host removal of href is undone by restoration.
3. Changing the marker changes the value cleanup writes into href; cleanup also removes that host marker.
4. Removing the marker leaves the absolute temporary href and clears the list.
5. A pre-existing same-name marker is overwritten during preparation and erased during cleanup.
6. Calling normalization twice records the first temporary absolute URL as the next original, losing the initial relative spelling.
7. An injected href restoration exception prevents restoring later links and prevents reaching header cleanup. The array is retained because execution never reaches its reset; this case must not be described as unconditional receipt loss.
8. An injected marker-removal exception after href restoration similarly prevents later cleanup, leaving a partial effect and retained list.
9. An injected marker write failure after its effect leaves an unrecorded marker because the write precedes both the try block and changedLinks.push.
10. A disconnected link is skipped and then forgotten, still carrying temporary href; later reattachment of the same object is therefore relevant.

An eleventh check confirms that intact a and area links restore their exact original raw href. Controlled exceptions test failure boundaries, not a claim that native attribute operations routinely fail for these literal names. Real callback/reaction/exception causes require browser validation. The tests do not prove that a specific full asynchronous production schedule reaches repeated normalization; they prove the helper has no self-protection if invoked again while effects remain outstanding.

## Fresh external evidence

Retrieved 2026-09-11; source observations are comparison inputs, not automatic product requirements.

| Primary source | Observed mechanism | Application and limit |
|---|---|---|
| [WHATWG HTML hyperlink href](https://html.spec.whatwg.org/multipage/links.html#dom-hyperlink-href) | The getter reinitializes URL state and returns its serialization, or raw/empty values under the specified absent/invalid cases. | The reflected property is not a raw mutation receipt. a and area share hyperlink machinery; browser-specific behavior still needs direct fixtures. |
| [MDN HTMLAnchorElement.href](https://developer.mozilla.org/en-US/docs/Web/API/HTMLAnchorElement/href) | Relative and empty attributes resolve against document base; getAttribute retains original spelling, and absence differs from empty href. | Compare exact raw presence/value for cleanup. Equal resolved destinations are not proof that the page retained WebClip's exact write. |
| [MDN Node.baseURI](https://developer.mozilla.org/en-US/docs/Web/API/Node/baseURI) | Base URL is evaluated on access and can change; an HTML base element can determine it. | Capture the temporary string once. Restoring raw relative text must not restore an obsolete base or pin the page to an old absolute destination. |
| [Mozilla Readability README](https://github.com/mozilla/readability) | parse modifies DOM; the official usage guidance recommends passing a document clone to avoid changing the source document. | Concrete adjacent architecture supporting representation-local changes. A clone alone is not frozen resource, shadow-tree, temporal or PDF fidelity. |
| [Mozilla Readability implementation](https://github.com/mozilla/readability/blob/main/Readability.js) | _fixRelativeUris captures baseURI, resolves through URL and preserves fragment-only links in its base-equals-document case. | Shows normalization in an article-processing representation and a deliberate fragment policy. WebClip cannot inherit that policy without its own PDF annotation contract. |
| [Microsoft compensation pattern](https://learn.microsoft.com/en-us/azure/architecture/patterns/compensating-transaction) | Compensation can fail and must retain progress, account for concurrent work and support idempotent steps. | Supports per-effect outcomes and independent cleanup continuation. This is an architectural analogy, not DOM evidence. |

The fresh search for Readability relative-link/base issues returned no results; direct official README and implementation retrieval succeeded after the raw-source URL failed. No validated new community complaint, prevalence estimate or usage trend is claimed. The user scenario is saving selected linked content while a SPA/router updates it, then continuing navigation after save/cancel without stale addresses being reinstated.

## Recommended contract and trade-offs

Keep a private record before any live write: exact scope, print generation, link object, owner document, original raw {present,value}, exact temporary raw {present,value}, effect phase and outcome. Compute the prospective normalized value once from the admitted representation/base. Skip exact no-op writes and links without href; an empty href is present and must not be collapsed into absence.

Prefer eliminating data-webclip-original-href entirely. Current source search found no independent consumer. If a future implementation retains a diagnostic marker, give its mutation a separate private original/temporary receipt and compare-before-restore; never read it as href authority. Pre-existing or newer host marker values must survive. Do not sweep arbitrary matching markers left by older code: without a trustworthy private receipt, an old marker cannot prove ownership or the original value.

| Observation at cleanup | Proposed effect/result |
|---|---|
| Stale token or receipt absent from this generation | No writes; never retarget by selector/id/path. |
| Exact raw href equals temporary pair | Restore exact private original pair, then observe the result. |
| Raw href differs, including absence or a differently spelled relative URL with the same destination | Preserve host state; superseded outcome. |
| Live value already equals original | No write; observed settlement only, not proof of who wrote it. |
| Read/write failure, disconnected node or changed document | Retain unknown debt, continue independent receipts, block unsafe new admission. |
| Already terminal receipt | No further writes, even after subsequent host edits. |

Generation A must settle before B starts in the conservative model. Same-generation repeated admission returns the existing receipt without rewriting/rebasing. The historical inheritance proposal could be implemented only as an explicit transfer of private authority with phases, temporary-value comparison and exact scope; silently treating A's temporary href as B's source is forbidden. Serialization is simpler and avoids a second receipt-transfer protocol, at the cost of postponing another print while unknown debt remains.

Do not silently classify detached as restored. The same object may return with a temporary attribute still installed. The model retains bounded debt and permits later same-document reconciliation; no replacement element is touched. Production must define document teardown and terminal degraded outcomes so a permanently detached object does not retain memory indefinitely. A timer alone cannot prove the old mutation was restored. The model intentionally leaves this lifetime policy unresolved rather than reporting false success.

Per-receipt try/catch must preserve progress and allow the next receipt to run. The broader cleanup orchestrator should isolate link, header, style and other restoration families and report aggregate debt; simply wrapping the entire old function in one catch still skips later cleanup. The model verifies two-link isolation, while the current-source check proves header reachability is lost on exception. It does not implement or claim a corrected whole-extension cleanup orchestrator.

If restoration throws after an effect, observe again on a bounded retry: when raw original is already present, settle without another write. If a host reaction replaces the restored value, preserve that newer state. Compare and effect must have no intervening await, and production must recheck document/generation around effects. Arbitrary browser reaction/reentrancy behavior is beyond the simplified double.

## Raw value, base URL and residual limits

The model deliberately distinguishes './item/1' from the written absolute temporary URL even though both resolve to the same destination. Comparing link.href instead of getAttribute would erase this distinction and could overwrite the site's new relative spelling.

When baseURI changes while the temporary absolute attribute remains, restore only the private original raw relative text. The resulting resolved destination now follows the page's current base. That is raw live-page restoration, not a guarantee that the destination equals the pre-print destination. Do not change baseURI or rewrite the original to an old absolute URL to manufacture destination equality. P0-071/P0-075 retain admitted printable-link semantics and renderer TOCTOU; a base-only change cannot be fully classified by href CAS alone.

CAS here means compare-before-write in a synchronous local sequence, not an atomic browser transaction. Exact-value comparison cannot detect ABA or a host write of the identical temporary string. The explicit limit test shows that an intermediate host change followed by the same temporary value still permits restoration. Readability-style cloning reduces live compensation needs but is not sufficient evidence of immutable admitted content. Scheme policy, fragments, malformed URLs, SVG links, real custom elements and physical PDF annotations are outside this model's validation claim.

## Performance, privacy and implementation path

Remove redundant DOM marker writes and avoid writes for already exact absolute values. Bound admitted link count, URL byte lengths, scanning work, pending receipts and cleanup work per pass. Use exact-node lookup plus bounded iterable pending storage in production; the toy model's linear find is not a scalability prescription. Keeping unresolved records is necessary for truthfulness but requires explicit scope teardown and diagnostics. Never serialize private receipts or complete href values into logs: URLs can contain sensitive query data. This proposal introduces no network request, host permission, service or external dependency.

Implementation path: private receipts without marker -> exact raw comparison and per-link failure isolation -> P1-199 generation/debt integration and whole-cleanup aggregation -> applicable browser/PDF fixtures. P1-218 resource attributes, P1-219 image wrappers, P1-220 generated header identity and P1-214 remote settlement retain separate ownership. Shared compensation primitives may reduce duplication, but must not flatten their different detached-node, topology and failure contracts.

## Validation and delivery boundary

`node project_tools/test_p1_221_link_revalidation_model.js`: **28 named checks PASS** — ten current-gap schedules, one intact a/area source control, sixteen proposed-contract checks and one explicit ABA limit. `node --check` also passed. Source slices intentionally fail on anchor drift and require revalidation after runtime changes. The URL/attribute double is not a complete HTML implementation or a production regression suite.

Required closure evidence remains implementation plus direct supported-browser success/cancel/failure checks, same-origin document scope, actual repeated/late preparation, href and marker host changes, base changes, detached/reattached nodes, partial effects, cleanup continuation and link/PDF annotation fidelity. Model PASS is not browser/PDF PASS. P1-221 remains **ACTIVE**; Registry status is unchanged.

Delivery checkpoint: exactly this evidence file and its companion model. Fresh-main branch, research-impact: owner PR, exact-head Repository Integrity, fresh main/head/mergeability/two-file guard, expected-head squash and exact merge-SHA push CI are required before canonical completion. PR/run records provide the final delivery identities; no future CI result is preclaimed here.

Runtime, manifest and version are unchanged. Hard fence: `EXPLICIT_USER_APPROVAL_FOR_RELEASE_POLICY_ACTIVATION`.
P1-231 S2 authorized=false; release authorized=false; product ZIP=false. Existing S0-F portability blocker, release policy/readiness/receipts, tags, GitHub Releases and deploy/publish remain untouched.
