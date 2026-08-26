# URL privacy / flattened print boundary audit delta — 2026-08-27

Baseline source HEAD: `6552f53f684636ae188320aa075bea850850d0be`.

This is a lossless audit checkpoint against existing P0 items. It is not a canonical registry replacement and does not assign a new P-number. Production/runtime/config/manifest are unchanged by this commit.

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

Audit documentation only. Product runtime/configuration and `manifest.json` are unchanged. Product tests were not rerun; the earlier `88/88 syntax + 74/74 deterministic PASS` remains historical evidence only.
