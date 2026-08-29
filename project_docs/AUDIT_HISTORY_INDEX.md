# Audit history index

This is the compact history needed to prevent repeated audit mistakes after verbose historical audit narratives are retired from the current tree.

It does **not** replace the current P registries:

- `PRIORITIES_P0_P1_P2.md` is canonical through P1-194;
- `AUDIT_CONSOLIDATION_INDEX.md` is canonical for P1-195…P1-225;
- detailed current findings/refinements remain in `AUDIT_DELTA_*.md`.

The purpose of this file is narrower: preserve rejected hypotheses, duplicate-owner corrections, important negative checks and deliberate product/security decisions that should not be rediscovered as new defects.

## Explicit corrections / retractions

### P0-039 generic `pendingAppends` capacity hypothesis — retracted

A temporary audit refinement claimed that a full generic `pendingAppends` queue could allow the next physical download/upload to complete without durable recovery metadata. Re-check of live callers showed the generic `safeAppendJournalEntry()` pending store is no longer on the current irreversible save path. Current local downloads use specialized `pendingDownloads` before `chrome.downloads.download()`, and Yandex saves use `pendingRemoteSaves` before signed PUT/publication.

Therefore that specific capacity hypothesis was retracted and P0-039 was restored to its prior REGRESSION status. Do not reopen this exact claim unless a future code change again introduces a live irreversible-save caller of generic `safeAppendJournalEntry()`.

Historical source: `DEEP_AUDIT_2026-08-25.md`, correction dated 2026-08-26.

### P1-004 / P1-171 exact child-document identity — duplicate owner corrected

The reused-`frameId` / missing exact child `documentId` generation finding was briefly restated under the P1-004 umbrella. The audit then explicitly deduplicated it: P1-004 remains the feature-level cross-origin iframe umbrella and is PARTIAL; **P1-171 is the single detailed owner** for the child-frame document-generation/navigation fence. No new P-number is allocated for the same root cause.

Historical source: `DEEP_AUDIT_2026-08-25.md`, `P1-004 / P1-171 registry deduplication`.

### Storage quota snapshot overbooking — stays under P1-043

Re-review showed that `ensureStorageBudget()` uses a storage-estimate snapshot plus one safety reserve but has no concurrent byte-reservation ledger. Concurrent large writers can therefore each pass against the same free-space snapshot. This was explicitly classified as the **same storage-admission root cause as P1-043**, refining P1-043 rather than allocating a new P-code.

Future audits must not allocate a new number merely for another manifestation of the same missing global persistent-byte reservation/admission contract.

## Rejected / non-new hypotheses

### Yandex path traversal through `joinDiskPath()` filename components — not reproduced

The suspected `..` escape did not reproduce in the reviewed path because `sanitizeDiskName()` strips trailing dots/spaces and dot-only segments collapse to `_`; destructive Yandex moves also revalidate managed-branch containment. Existing P0-040/P1-090 controls were considered effective for that reviewed path.

This is not a blanket proof that every future path-building call is safe; it means this exact already-reviewed hypothesis must not be reintroduced without a new source path/repro.

### Journal / Options DOM-XSS hypothesis — no new sink found in the reviewed pass

Dynamic Journal content was built through DOM nodes/`textContent`; reviewed Options `innerHTML` usage was static extension-owned markup and external errors were inserted as text. No new Journal/Options DOM-XSS P-item was allocated in that pass.

Future source changes can invalidate this positive control, but the old reviewed state is not a new finding by itself.

### `prepared-save-as.js` generic lifecycle finding — already owned

The reviewed prepared-Save-As path produced no independent new finding beyond existing P1-156/P1-157 at that time: native `saveAs:true` remained page-owned/unbounded while listener/release/runtime-message cleanup gaps were already registered. Do not create a duplicate owner from the same historical observation; later independent receipt/terminal-file findings keep their own owners.

## Deliberate product/security decisions preserved from history

### Public links enabled by default is intentional

`createPublicLinks` ON-by-default was explicitly treated as a product decision, not an audit defect. The audit owner for per-entry revocation was P1-164. Do not classify the default alone as a defect without a changed product requirement.

### Session-only OAuth access token is intentional baseline

The historical security decision kept the Yandex access token in `chrome.storage.session`, with PKCE S256 and no persisted refresh token as the default browser-only posture. Alternative persistence designs were evaluated as product/security trade-offs, not silently adopted requirements.

### Enterprise browser policy was not bypassed

The audit environment's managed Chromium blocked normal unpacked-extension loading. The project intentionally did not bypass the policy and did not count blocked full-unpacked runs as PASS. Managed browser evidence is regression evidence; real unpacked Chrome remains release QA.

## Historical positive controls worth retaining

At the reviewed historical checkpoints:

- no remotely hosted/executed extension code or eval-like execution was found;
- cross-origin site access remained optional host permission rather than install-time all-sites permission;
- Yandex tokens were sent in Authorization headers rather than query strings;
- reviewed network fetch paths were HTTPS/AbortController bounded and signed offscreen transfers rejected redirects to non-approved signed hosts;
- no new direct token-exfiltration, arbitrary remote-code execution, content-script-to-admin bypass or incognito-journal boundary bypass was found in the cited passes;
- Settings export remained allowlisted and excluded OAuth secrets, PKCE pending state, Journal/checkpoint data and OperationLog contents.

These are historical positive controls, not perpetual guarantees. Re-audit them after relevant runtime/security-boundary changes.

## Historical test-gate interpretation

`DEEP_AUDIT_2026-08-25.md` began from an older 84/84 syntax + 71/71 deterministic baseline. Later product work reached a documented **88/88 syntax + 74/74 deterministic** gate. Subsequent audit/consolidation work was docs-only with respect to production runtime, but those suites were not rerun merely because documentation changed.

Current compact truth is in `TEST_STATUS.md`; detailed historical checkpoints are in `TEST_EVIDENCE.md`.

## Retirement role

This file is designed to preserve the unique negative/correction history needed before retiring the verbose `DEEP_AUDIT_2026-08-25.md` from current `main`.

The large audit file must still receive a final retirement comparison before deletion. In particular, all P-number assignments must already be present in the current registries and any additional explicit correction/retraction discovered during that comparison must be added here first.
