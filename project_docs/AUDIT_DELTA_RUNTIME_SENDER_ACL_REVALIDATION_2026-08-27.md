# Audit delta — runtime sender ACL revalidation — 2026-08-27

Baseline HEAD before this audit block: `39b62779c36c1079a4d44b7d455368bf051ecf13`.

Docs-only positive/negative audit checkpoint. Production runtime and `manifest.json` are unchanged. Canonical registry synchronization is not claimed.

## Scope

Fresh revalidation of the privileged `chrome.runtime.onMessage` trust boundary around existing `P0-020`, with attention to content-script capabilities that intentionally remain exposed for save/template/frame flows.

## Result

No new administrative/OAuth/import/clear/OperationLog privilege bypass was found in this pass. `P0-020`'s current sender-kind architecture remains materially effective and must be preserved by future refactors.

This does **not** mark P0-020 release-closed: real unpacked/browser regression remains required, and separate document-generation/hostile-page issues remain open under P0-070/P1-171/P1-175/P0-075.

## Confirmed trust boundary

`assertRuntimeMessageSender(type, sender)` first requires `sender.id === chrome.runtime.id`, classifies extension-owned URLs as extension pages, and only permits ordinary http(s) tab content contexts when `type` is explicitly present in `CONTENT_SCRIPT_MESSAGE_TYPES`.

Messages not in that content allowlist are extension-only by default. Therefore Options/Journal administrative mutation types, OAuth setup/token operations, settings import, Journal replace/clear, OperationLog management, storage-health administration and similar privileged RPC do not become reachable merely because a page/content script can name their message type.

Incognito content requests are fail-closed for data-bearing actions, with only the existing invalidate/open-options exceptions retained.

## Content capabilities revalidated

### PDF generate/upload/retry/download

Content save/retry handlers derive the tab from `sender.tab.id`; they do not accept a caller-supplied arbitrary target tab for the privileged PDF/cache operation.

This preserves P0-020's tab-ownership boundary. The still-open bug is **document generation**, not sender privilege: same tabId can point to a newer document after navigation/reload. That remains P0-070/P0-023/P1-175 and must not be misclassified as an ACL bypass.

### Journal template/list access

For content callers, `WEBCLIP_JOURNAL_LIST` ignores arbitrary requested URL authority and rebinds the query to the sender's current tab URL/site. Results are additionally bounded by the content-template count/response limits.

This is the correct P0-020 shape. P1-182/P0-066 still govern what sensitive fields may exist inside legitimate current-site snapshot/template data.

### Open saved Journal file

`WEBCLIP_OPEN_JOURNAL_SAVED_FILE`:

- requires a real Journal entry;
- requires `destination === yandex`;
- requires an allowed HTTPS Yandex Disk/Yadi public URL;
- for content callers, compares sender current `siteKey` with the entry's site identity before opening;
- opens the bounded validated public URL rather than returning OAuth credentials or arbitrary local paths to the page.

This pass found no cross-site arbitrary-entry open authority through this RPC. P1-189 still requires imported site identity to be canonicalized so the `entrySiteKey` itself cannot be forged by backup metadata.

### Generic OPEN_URL

Content `WEBCLIP_OPEN_URL` is restricted to HTTPS Yandex Disk/Yadi hosts by `isAllowedContentOpenUrl()`. It is not an arbitrary-scheme/arbitrary-host tab creation primitive.

### Cross-origin frame agents

`WEBCLIP_FRAME_AGENT_LIST` and `WEBCLIP_FRAME_AGENT_TARGET` additionally require a **top-frame** content sender; tab identity comes from `sender.tab.id`. Child REGISTER/STATE require child frames and optional host permission.

The remaining weakness is exact child/top document-generation binding (P1-171), not absence of sender ACL.

## Important non-ACL dependencies

A correct sender allowlist does not make the host page trustworthy.

P0-075 remains required because hostile page code can observe/mutate current content-script DOM/control state and may synthesize events during an active WebClip session. User-authorizing actions therefore need trusted-input/extension-state gates in addition to runtime sender classification.

Likewise:

- P0-070/P0-023/P1-175 own stale same-tab/new-document authority;
- P1-171 owns exact frame/top document identity;
- P1-189 owns canonical imported site identity used by saved-file/site checks;
- P0-066/P1-182 own confidentiality of data legitimately returned for the current site.

## Regression inventory to preserve P0-020

1. Content sender cannot invoke OAuth start/finish/manual token/disconnect/config writes.
2. Content sender cannot invoke Journal replace-import/clear/delete-admin paths by inventing message types outside the allowlist.
3. Content sender cannot list OperationLog, clear logs, change retention or import settings.
4. Content Journal list with forged `message.url/siteUrl` still resolves only sender current URL/site.
5. Content saved-file open for another site is rejected even with a valid Journal id.
6. Content OPEN_URL rejects non-HTTPS and non-Yandex hosts.
7. Frame-agent LIST/TARGET from a child frame is rejected; top-frame command still requires granted target permission in the worker.
8. Incognito content save/data access remains fail-closed.
9. Navigation/reload tests remain separate and must prove exact document fencing rather than weakening sender ACL to compensate.

## Classification

No new P-number created. This is a positive revalidation checkpoint for `P0-020` and a dependency map to existing open document/provenance/host-page items.

`P1-197` remains the newly evidence-reserved OperationLog clear-generation defect from the immediately preceding audit checkpoint. No `P0-079` or `P2-020` is created here.

Previous product test gate was not re-run by this docs-only audit checkpoint.
