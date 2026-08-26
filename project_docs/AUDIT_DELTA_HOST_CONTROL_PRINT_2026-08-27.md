# Host-page control plane / print URI audit delta — 2026-08-27

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

Audit documentation only. Product runtime/configuration and `manifest.json` are unchanged. Product tests were not rerun; the earlier `88/88 syntax + 74/74 deterministic PASS` remains historical evidence only.
