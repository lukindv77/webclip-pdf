# P1-094 closure — bounded Journal session source-context retention

Status: **REGRESSION**

## Requirement

`webclipJournalContext:*` in `chrome.storage.session` must not grow without bound or retain source URLs indefinitely. Historical requirement: URL bound, 24h TTL and hard cap 512 contexts, while preserving the confirmed Journal mode-switching UX.

## Physical implementation

- `service-worker.js`
  - `JOURNAL_CONTEXT_TTL_MS = 24h`;
  - `MAX_JOURNAL_SESSION_CONTEXTS = 512`;
  - `MAX_JOURNAL_CONTEXT_URL_CHARS = 8192`;
  - `MAX_JOURNAL_CONTEXT_ID_CHARS = 180`;
  - `storeJournalSourceContext()` serializes create/prune operations;
  - expired, malformed, future-dated and overflow contexts are removed before storing a new context;
  - retention selection uses a bounded min-heap of at most 511 prior survivors instead of materializing/sorting every context descriptor;
  - remove operations are issued in batches of 128;
  - unrelated `chrome.storage.session` keys are untouched.
- `journal.js` and `popup.js`
  - bound contextId before forming the storage key;
  - reject expired/future-dated/oversized legacy context values;
  - context is deliberately not consumed after first read so switching `all/current/site` remains functional.

## Deterministic regression

`project_tools/test_p1_094_journal_context_retention.js` validates:

- >512 retained contexts are pruned to exactly the hard cap after a new create;
- TTL/future-dated cleanup;
- 8192-character URL bound;
- unrelated session values survive;
- 20 concurrent context creates remain capped at 512;
- Journal/popup readers enforce TTL/size/contextId bounds;
- Journal load does not consume the context.

## Release boundary

This is a local deterministic closure only. Real Chrome extension-page/session-storage regression remains part of release QA. Manifest stays `0.9.8` until the audit gate and real Chrome/Yandex E2E are complete.

## Scope note

P1-094 closes retention/size semantics only. It does **not** claim closure of the separately history-reserved P1-123 Chrome `storage.session` operation-deadline/late-settlement requirement.
