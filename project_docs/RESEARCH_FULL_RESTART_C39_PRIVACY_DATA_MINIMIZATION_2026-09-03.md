# WebClip — fresh full-project research — C39 Privacy / data minimization — 2026-09-03

Date: 2026-09-03  
Canonical source baseline: `00871591c4ddea4680e54b03ad05e2390c9f9605`  
Exact `content.js` blob: `f3ee7b51fe9ee94fdfe36e8a7c99f14a548fdc4e`  
Exact `service-worker.js` blob: `cffe46adbd0227bae51c95462d6d705b264838fe`  
Scope: fresh-restart coordinate **C39 — Privacy / data minimization**.

## Result

**C39: `L4-REVALIDATED / FINDING + POSITIVE/PHYSICAL-PDF-TEXT/URI/SELECTION-SNAPSHOT/DURABLE-FLOW/SANITIZED CONTROLS (P0-066, P1-182; P0-045 supporting/source, P0-033 positive)`.**

Fresh exact-source evidence confirms three distinct confidentiality boundaries:

1. the exact page URL is valid volatile admission authority, but the same raw value is also emitted into visible PDF text and carried into durable/cache/Journal/export surfaces without a shared confidentiality projection;
2. portable SelectionSnapshot locator records retain selected, parent and neighboring plaintext plus raw `href` and `src` strings;
3. the popup reads persistent backup status before current-tab classification and contains no incognito fence, so the already-owned private-context boundary remains source-visible and awaits real unpacked C46 validation.

No new P-code is needed. This tranche changes research evidence/tooling only. Runtime, manifest `0.9.8`, Registry wording/status and release readiness remain unchanged; release remains **NOT READY**.

## Evidence level and method

The accepted tranche combines:

- **L1 exact-source inspection** of `content.js`, `service-worker.js`, `offscreen.js`, `popup.js` and `manifest.json`;
- **L2 deterministic current-source flow projection** for raw URL propagation through cache metadata, pending metadata, Journal identity/template and full export;
- **L4 physical Chromium PDF evidence** with extracted text and PDF `/URI` annotations;
- positive causal controls applying one test-only confidentiality projection before the physical print cut.

No real Yandex account, public link, native Save As dialog or unpacked incognito extension was exercised. Those external boundaries stay explicit in C42, C41 and C46.

## Accepted exact-source execution

- Chrome `151.0.7922.173`;
- workflow run `33713855080`;
- job `100518803841`;
- exact accepted workflow head `100940228d20b942a535c90eb62c1794dabcb59d`;
- conclusion **SUCCESS**;
- temporary raw-result receipt commit `0d74a4fcea2bd4cb1cf9f2176f0c52bec981abcf`;
- raw result SHA-256 `5374f858d32c0e50a3acaa0b6d1443d86486366b169205a85deee44dde8f56c5`;
- durable harness `project_tools/research_c39_privacy_data_minimization.py`.

Run `33713745680` is not accepted evidence. It failed because the first assertion assumed Chromium would emit a self-URL-with-fragment as a PDF `/URI`. The raw result instead showed the URL in PDF text while the selected content link became the URI annotation. The corrected accepted run preserves that observed distinction.

## Fresh physical matrix

### Raw page URL -> visible PDF text

The fixture page URL was:

`http://127.0.0.1:<ephemeral>/private/report?token=C39_URL_QUERY_SECRET#C39_URL_FRAGMENT_SECRET`

The actual `WEBCLIP_GENERATE_PDF` request retained both synthetic secret markers. The one-page physical PDF also contained both markers in extracted visible text. The chosen self-link did not become a PDF `/URI` in this exact renderer case, so the finding is specifically **visible physical PDF text**, not an inferred link annotation.

This is direct current-product behavior: `buildSaveMeta()` assigns `url: location.href`, and `prepareForPrint()` assigns the same value to both `urlLink.href` and `urlLink.textContent`.

### Selected content link -> physical PDF URI annotation

The selected anchor carried `/destination?token=C39_LOCATOR_HREF_SECRET`. The physical PDF contained that marker in an actual `/URI` annotation. This proves that URL confidentiality is not limited to the WebClip metadata header: link targets in the admitted content are a second physical artifact boundary.

### SelectionSnapshot -> portable plaintext and raw locator URLs

The actual request's serialized SelectionSnapshot contained all six independent markers:

- selected element plaintext;
- parent plaintext;
- previous-sibling plaintext;
- next-sibling plaintext;
- raw selected `href` query;
- raw excluded image `src` query.

Current `createSimpleElementLocator()` writes these as `text`, `parentText`, `previousText`, `nextText`, `href` and `src`. Worker-side `sanitizeSelectionSnapshot()` bounds their lengths but retains their content. This is the exact already-owned **P1-182** condition.

### Durable propagation control

The deterministic exact-source projection used a synthetic URL containing userinfo, a query marker and a fragment marker. Current behavior retained:

- userinfo in all eight modeled surfaces;
- query data in all eight modeled surfaces;
- fragment data in the five raw-URL/export surfaces, while `normalizeJournalUrl()` and `normalizeImportedHttpUrl()` removed only the fragment.

The surfaces were content metadata, cache metadata, cache `sourceUrl`, pending metadata, Journal `url`, Journal `urlKey`, content template `url` and the serialized full-export entry. `stageFullJournalExportOnce()` then stages those serialized records, and offscreen `text-chunks-upload` submits the exact staged Blob.

This is L2/source-flow evidence, not a claim of real remote Yandex transmission. C42 remains responsible for the physical external upload/object/public-identity boundary.

### Unified sanitized causal control

The test-only control removed userinfo, query and fragment while preserving origin/path, and applied the result to both the WebClip header and selected link before printing. The second one-page PDF:

- preserved selected content;
- contained none of the page URL secret markers in text or URI annotations;
- contained no selected-link query marker in URI annotations;
- retained readable, usable origin/path links.

The deterministic durable-flow control also reduced all three synthetic marker counts to zero across every modeled surface. This establishes causality and feasibility; it does not claim the production sanitizer exists.

## Current positive controls

Two existing boundaries are materially useful and must be preserved:

- `sanitizeContentSaveMeta()` derives page authority from the exact sender tab URL and restricts the scheme to HTTP/HTTPS. This prevents untrusted content metadata from choosing a different source URL, but it is an authority check rather than data minimization.
- `sanitizeOperationLogValue()` removes token-like values, replaces ordinary URL queries with `[REDACTED_QUERY]`, and treats signed Yandex Disk paths as opaque. **P0-033 remains DONE** and is not reopened.

## Incognito source boundary

Current `popup.js` calls `loadBackupStatus()` before `getActiveSourceTab()` and contains no `incognito` check. `manifest.json` contains no explicit `incognito` mode, while the same popup also owns `chrome.permissions.request()` for optional frame origins. This is fresh source support for **P0-045 ACTIVE**, not L5 proof of actual private-window leakage or prompt behavior.

Chrome documents split and spanning extension incognito modes and requires extensions to respect the user's incognito choice. Chrome Web Store Limited Use policy also limits collection/transmission of browsing activity to what is necessary for the disclosed user-facing feature. Relevant primary references:

- https://developer.chrome.com/docs/extensions/reference/manifest/incognito
- https://developer.chrome.com/docs/webstore/program-policies/limited-use
- https://developer.chrome.com/docs/webstore/program-policies/user-data-faq
- https://developer.chrome.com/docs/webstore/cws-dashboard-privacy

RFC 3986 section 7.5 separately warns that userinfo in a URI is frequently rendered or stored and therefore cannot be treated as secret. Reference: https://www.rfc-editor.org/rfc/rfc3986#section-7.5

These sources constrain the defensive design; they do not substitute for project evidence.

## B1–B9 mapping

| Boundary | Fresh C39 result |
|---|---|
| B1 User Intent | User save intent does not imply consent to persist credentials/query secrets or surrounding locator plaintext. |
| B2 Admission / exact generation | Exact raw sender URL is legitimate volatile generation authority; minimization must not weaken this check. |
| B3 Capture | Selected content can contain sensitive link targets, and locator capture adds surrounding plaintext/raw resource URLs. |
| B4 Static Materialization | The print header copies raw URL into page-visible text and href. |
| B5 Renderer | Chromium turns the header into visible PDF text and selected links into URI annotations. |
| B6 Physical Artifact | Synthetic query/fragment markers are physically present in PDF text; selected-link query is physically present in `/URI`. |
| B7 Persistence / Transfer | Cache/pending metadata and exact-Blob offscreen transfers inherit upstream confidentiality choices. |
| B8 Journal / Provenance | Journal `url`, `urlKey`, templates and full export retain more URL/locator data than needed. |
| B9 Later Reading / Recovery | Reopened/exported artifacts can expose durable secrets; incognito and restore boundaries remain open. |

## Owner reconciliation

- **P0-066 ACTIVE** directly owns one durable/display URL confidentiality sanitizer across source, locator and imported/public metadata.
- **P1-182 ACTIVE** directly owns removal of surrounding plaintext and sensitive raw `href`/`src` from durable SelectionSnapshot while preserving restoration quality with privacy-preserving fingerprints.
- **P0-045 ACTIVE** remains supporting/source for fail-closed incognito behavior; real extension validation is deferred to C46.
- **P0-033 DONE** is a positive redaction architecture example only.

No new owner is warranted, no DONE owner is reopened, and Registry wording/status remains unchanged.

## Architecture direction

Use separate typed representations instead of one URL string crossing every boundary:

1. keep the exact sender-tab URL only as volatile B2 generation authority;
2. derive one default-minimized display/durable projection that removes userinfo, query and fragment while retaining a useful origin/path;
3. apply the same confidentiality policy to PDF header text, PDF header href, admitted link targets, cache/pending metadata, Journal keys/templates and export/import normalization;
4. replace portable surrounding locator plaintext/raw `href`/`src` with versioned privacy-preserving fingerprints plus structural fields;
5. keep OperationLog's existing redaction stricter and independent of durable identity fields;
6. add explicit incognito classification before any persistent status/data read or permission flow.

The raw source URL may remain in volatile operation memory where exact admission/reconciliation needs it. It must not silently become durable/display/external metadata.

## Coverage conclusion

C39 advances from `NOT-TRIAGED / UNKNOWN` to the accepted L4 classification above. C40 — physical PDF bytes / cache identity — is the next sequential coordinate. Open work for C40–C46 is published in the canonical baseline's Coverage Matrix task projection.
