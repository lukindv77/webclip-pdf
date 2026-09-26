# Research evidence — P0-066 durable URL policy implementation tranche — 2026-09-26

Canonical baseline: `main` at `f9eaf36a07248e6fe27c2bba444725d5715d18a0`
(post-merge Repository Integrity #1187 / run `36252938810` **SUCCESS**).

Owner: **P0-066** — one durable/display URL confidentiality sanitizer must cover source URLs,
locator URLs and imported/public metadata; secrets/userinfo/non-durable schemes cannot persist.

Root cause and acceptance are defined in
`RESEARCH_P0_066_DURABLE_URL_CONFIDENTIALITY_REVALIDATION_2026-09-16_EVIDENCE.md`.
This tranche implements the source/journal/import/export/public-capability part of that contract.

## User decisions applied

- Query handling: redact only values of credential-like parameters; keep benign query meaning.
  URL userinfo is always removed; fragments are removed.
- Legacy rows: local IndexedDB rows are **not** migrated. Export, Yandex Journal backup and import
  always carry the sanitized representation. Already externalized historical backups are not
  claimed to be retroactively scrubbed.
- Public links: `createPublicLinks` default is unchanged (user decision: keep enabled). The public
  link receives an explicit capability policy instead.

## Implementation

One versioned policy block `P0-066 durable URL policy v1` (`webclipIsSensitiveUrlParamName`,
`webclipSanitizeDurableHttpUrl`) exists in `service-worker.js` (authoritative boundary) and,
byte-identical after indentation, in `content.js` (PDF header, which is rendered before any worker
round-trip). A new package file was deliberately not added: that would change the 34-file package
contract owned by P1-231. The deterministic test enforces that both copies are identical.

Policy semantics (same parameter-name classifier as the 2026-09-16 acceptance model, extended to
camelCase names such as `authToken`/`apiKey`):

- only `http:`/`https:` survive; unparsable, `data:`, `blob:`, `javascript:`, `file:` etc. → `''`
  (fail closed; the former raw-string fallback of `normalizeJournalUrl` is removed);
- userinfo and fragment removed;
- values of credential-like parameters (`token`, `session`, `sid`, `sig`/`signature`, `key`/`api_key`,
  `code`, `password`, `jwt`, `credential`, `secret`, `X-Amz-*` signatures/credentials/tokens, …)
  become `[REDACTED]`; other parameters keep their values;
- if nothing needs redaction the exact previous `URL#toString()` serialization is kept, so existing
  `urlKey` identities of ordinary pages remain stable;
- idempotent across export/import cycles.

Boundaries now consuming the policy:

| Surface | Change |
|---|---|
| content save admission (`sanitizeContentSaveMeta`) | trusted tab URL sanitized before Journal, pending local/remote checkpoints, PDF retry cache metadata and OperationLog records |
| `normalizeJournalUrl` (urlKey, views/templates, grouping, retry-cache URL comparison) | central policy; both sides of every key comparison are sanitized identically |
| Journal import (`normalizeImportedHttpUrl`) | central policy |
| imported/stored `publicUrl` (`normalizeImportedHttpsUrl`) | public-capability policy (HTTPS, `disk.yandex.ru`/`*.disk.yandex.ru`/`yadi.sk`, no userinfo, no fragment, share query kept) instead of any HTTPS URL |
| fresh Yandex API public URL / content open (`isAllowedContentOpenUrl`) | explicit userinfo rejection (URL.hostname ignores userinfo) |
| full Journal export and Yandex Journal backup (`readJournalEntryBatch`) | `sanitizePortableJournalEntryUrls` on the portable copy; stored rows are not mutated |
| Journal copy of the PDF source receipt (`sourceReceipt.applicationGeneration.href`) | sanitized on Journal append, import and export (`withDurableSourceReceiptHref`); the PDF retry-cache copy used for live matching is unchanged |
| PDF header "Полный URL страницы" (`content.js buildSaveMeta`) | sanitized at the source |
| content Journal template same-page detection | compares sanitized entry URL with the sanitized current URL (also fixes fragment-only false "Источник" labels) |

## Deterministic coverage

Added `project_tools/test_p0_066_durable_url_policy.js` (87 checks): identical policy blocks,
redaction vectors, benign no-op serialization, idempotence, fail-closed schemes, every boundary
above, public-capability accept/reject vectors, portable legacy-row projection without mutation.

Synchronized source witnesses: `test_p0_070_journal_source_receipt_finalization.js` expects the wrapped receipt normalization; `test_runtime_production_entry_selective_adoption_reconciliation_model.js` admits `content.js` in the bounded runtime delta; `test_p1_086_087_readonly_download_identity.js` sandbox gains the
portable URL projection dependency. Current RPF / legacy-subset RPF pins move with the runtime blobs
(values from local authority output on the exact commit, confirmed by exact-head CI).

## Remaining P0-066 scope (owner stays ACTIVE)

- SelectionSnapshot locator `href`/`src` URL features — composes with **P1-182**; not changed here.
- Real unpacked Chrome regression across the surface matrix.
- Diagnostics/OperationLog remain covered by P0-033 as a separate positive control.

No release action, manifest change, live provider call or browser qualification is performed.
Manifest remains `0.9.8`; release readiness remains **NOT READY**.
