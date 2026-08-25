# P1-123 / P1-127 closure

Status: **REGRESSION** for both history-reserved requirements.

Manifest remains **0.9.8**. This is audit closure evidence, not Chrome/Yandex release QA.

## P1-123 — bounded journal source-context session operations

`storeJournalSourceContext()` now exposes a 10-second bounded caller wait around the full serialized `chrome.storage.session` context mutation (`get(null)` / batched `remove` / final `set`). Chrome Storage operations are non-cancellable, so the local timeout deliberately does **not** release the mutation chain: the chain remains attached to the actual underlying promise settlement. A newer context create therefore cannot overtake an older timed-out get/remove/set.

`openJournalPage()` awaits the bounded context store before `createTabNextTo()`. If session storage is hung or fails, opening Journal fails closed and no Journal tab is created with an unconfirmed source context. Late actual completion remains serialized and bounded by the existing P1-094 TTL/cap retention model.

The context is still not consumed when Journal reads it; switching an already-open Journal between all/current URL/current site remains possible.

## P1-127 — bounded Journal extension-page Chrome API health/context/restore reads

`journal.js` now has a 10-second `readJournalExtensionApiBounded()` path for:

- source-context `chrome.storage.session.get`;
- source `chrome.tabs.get` refresh;
- restored `webclipJournalGroupByUrl` preference;
- durable `webclipJournalRevision` fallback marker.

The Journal service-worker health ping uses the existing bounded read-only runtime-message helper with the same 10-second UI deadline, preserving its global unresolved-read cap and same-request reuse semantics.

`popup.js` applies a 10-second bounded helper to Journal backup status, active-tab lookup, session source-context read, source-tab refresh, and the runtime request that opens Journal. A never-settling Chrome API call can no longer leave these Journal context/status/restore paths pending indefinitely.

## Regression evidence

Dedicated deterministic test: `project_tools/test_p1_123_127_extension_api_deadlines.js`.

It verifies:

- timed-out session get keeps the next mutation behind the actual-settlement barrier;
- timed-out remove cannot be overtaken by the final set;
- timed-out set keeps the next context mutation queued until actual settlement;
- Journal and popup bounded helper reject never-settling reads;
- all named health/context/restore production call-sites use the bounded paths;
- Journal tab creation remains after successful context storage.

Related regressions remain green:

- `test_p1_094_journal_context_retention.js`;
- `test_readonly_ui_rpc_deadlines.js`.

P1-124/P1-125/P1-126 and P1-128+ are not claimed closed by this delta.
