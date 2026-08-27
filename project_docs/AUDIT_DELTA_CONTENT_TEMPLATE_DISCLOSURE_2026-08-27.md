# Audit delta — content template disclosure boundary — 2026-08-27

Baseline HEAD before this audit block: `57c414cae7aa64bc528d6fd89bf946b510bba7a6`.

Docs-only audit checkpoint. Production runtime and `manifest.json` are unchanged. Canonical large-table synchronization is not claimed.

## Scope

Fresh audit of `WEBCLIP_JOURNAL_LIST` data returned to content UI and what becomes host-page-readable DOM. Existing owners: `P0-075` hostile-page/content-script DOM boundary, `P0-066` URL confidentiality, with `P1-157` for direct unbounded content runtime RPC.

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

Previous product test gate was not re-run by this docs-only audit checkpoint.
