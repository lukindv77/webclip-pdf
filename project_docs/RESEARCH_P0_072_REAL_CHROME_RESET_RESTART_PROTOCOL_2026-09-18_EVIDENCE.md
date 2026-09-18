# P0-072 — real Chrome local-download reset/restart physical evidence protocol

Date: 2026-09-18

Canonical implementation baseline reviewed: `0aedf04740d19b0f5ae40580a5df9282d47594d4`.

Post-merge Repository Integrity on that exact main: run `35336815211`, **SUCCESS**.

Owner: `P0-072 ACTIVE` — bulk Journal clear/replace must not erase reconciliation authority for an already admitted non-cancellable external effect.

This tranche adds **research tooling only**. It changes no production runtime, manifest, permissions, release gate, owner status, build, tag, deploy, Chrome user data or Yandex state.

Research-change classification: **structural** — this document becomes new canonical evidence/protocol inventory for an existing ACTIVE owner; it does not change P0-072 owner status or acceptance semantics.

## Goal

Prepare an exact-source physical Chrome protocol for the remaining local-download part of P0-072 closure without introducing production test hooks or altering the worker under test.

The physical schedule to prove is:

1. production WebClip creates a real automatic PDF download;
2. durable `pendingDownloads` reaches `admitted-unknown` before the Chrome side effect;
3. the real Chrome `DownloadItem` is paused immediately from a separate extension page via `chrome.downloads.onCreated`;
4. production `WEBCLIP_JOURNAL_CLEAR` runs while the physical download is admitted/nonterminal;
5. the pending receipt survives and becomes `supersededByJournalReset`;
6. the same exact DownloadItem later reaches terminal state without old Journal resurrection;
7. a second admitted/reset-superseded download survives an actual full Chromium `SIGKILL` and same-profile restart;
8. the existing production maintenance/alarm path reconciles terminal or permanently unknown Chrome truth without deleting unresolved evidence or recreating the old Journal generation.

This protocol is **not** Yandex evidence and does not close P1-090.

## Why no production test hook is needed

The existing Chrome integration harness already launches the unpacked extension through CDP and exercises the real PDF/automatic-download path.

A deterministic physical race can be created from another extension page without changing production JavaScript:

- install a real `chrome.downloads.onCreated` listener before starting PDF generation;
- when the PDF DownloadItem appears, immediately call `chrome.downloads.pause(downloadId)`;
- wait until IndexedDB shows the production durable row bound to that exact numeric `downloadId` with `downloadAdmissionPhase = admitted-unknown`;
- issue the normal production Journal clear message.

The pause is a Chrome-owned state transition on the real DownloadItem. It does not modify service-worker code or fake the P0-072 receipt.

## Shared browser driver refinement

`project_tools/browser_p1_007_unpacked_integration.js` is refactored only as reusable research infrastructure:

- helper functions are exported when the file is `require()`d;
- direct execution remains unchanged behind `require.main === module`;
- `launchChromium()` optionally accepts an existing profile and can preserve it across process termination;
- the stop helper can use `SIGKILL` for a true browser-process crash boundary;
- the disposable extension preparation can disable only the historical Yandex API mock rewrite, allowing this P0-072 harness to keep `service-worker.js` bytes exact;
- existing P1-007 default behavior continues to use the mock.

No production package file consumes these helpers.

## Physical harness

New tool:

`project_tools/research_p0_072_real_chrome_reset_restart.js`

The harness uses synthetic localhost content and a disposable Chrome profile only.

Before running the schedule it:

- hashes repository `service-worker.js`;
- copies the extension through the existing test-preparation path with Yandex rewrite disabled;
- re-hashes the copied worker and requires byte equality;
- checks the current source ordering and restart/recovery contract.

### Case A — real Chrome late completion after reset

The harness:

1. opens a synthetic article in the real unpacked extension;
2. selects the article through production content UI;
3. starts the production PDF download flow;
4. captures and pauses the real Chrome PDF DownloadItem at `onCreated`;
5. requires a bound numeric durable receipt in `admitted-unknown`;
6. runs production `WEBCLIP_JOURNAL_CLEAR`;
7. requires that exact receipt to become `supersededByJournalReset`;
8. resumes the same DownloadItem;
9. requires physical `complete`;
10. checks the file exists, is nontrivial and begins with `%PDF-`;
11. requires the durable receipt to retire;
12. requires the cleared Journal entry not to be recreated.

This is the real-Chrome positive control for reset + late terminal local download settlement.

### Case B — admitted receipt across full browser crash/restart

The harness creates a second paused admitted download, clears the Journal, confirms the receipt is reset-superseded, then kills the **entire Chromium process with SIGKILL** while preserving the profile.

It restarts Chromium from the same profile and exact unpacked extension path, then requires:

- unchanged extension id;
- the same exact durable `pendingDownloads` receipt still present with `supersededByJournalReset`;
- the exact Chrome DownloadItem still discoverable by id.

If the DownloadItem remains resumable, the harness resumes it. It then triggers the existing production `webclip-operation-log-cleanup` alarm immediately rather than waiting one minute for the normal startup alarm.

Acceptable production outcomes are:

- terminal Chrome state is reconciled and the receipt is retired; or
- if the physical state cannot be settled, the receipt remains durable as `unknown/manual-resolution` with the reset-supersession marker.

In both cases an old-generation Journal entry is forbidden.

## Deterministic harness contract

New source-level witness:

`project_tools/test_p0_072_real_chrome_reset_restart_harness.js`

It proves the harness is still bound to:

- exact copied worker bytes;
- real `chrome.downloads.onCreated` + `pause`;
- real production `WEBCLIP_JOURNAL_CLEAR`;
- exact `admitted-unknown` / `supersededByJournalReset` receipt states;
- same DownloadItem resume;
- physical PDF signature;
- full browser `SIGKILL`;
- same-profile restart;
- existing production maintenance alarm;
- durable manual-resolution fallback;
- zero Yandex credential/API path;
- explicit `P1-090 ACTIVE`, `P0-072 ACTIVE`, release `NOT READY`.

Passing this deterministic witness means **the physical protocol is wired correctly**. It is not a substitute for actually running Chrome.

## Execution contract

Authorized physical execution command:

```bash
WEBCLIP_CHROME_FOR_TESTING=/path/to/chrome \
node project_tools/research_p0_072_real_chrome_reset_restart.js
```

The harness emits one machine-readable terminal line:

```text
P0_072_REAL_CHROME_RESULT={...}
```

A closure-quality evidence record must retain, at minimum:

- exact Git commit SHA under test;
- Chrome version / user agent;
- exact worker/content/manifest SHA-256 values emitted by the harness;
- Case A download id, reset operation id, terminal state and physical PDF byte count;
- Case B download id, pre-crash and post-restart receipt timestamps, Chrome state after restart, final receipt outcome;
- the harness result SHA;
- sanitized logs sufficient to diagnose a failure.

No user document, OAuth token, signed URL or Yandex object is involved.

## Hosted execution attempt on 2026-09-18

The GitHub-hosted execution campaign did **not** produce a physical P0-072 PASS.

The decisive controlled run is `35342277067` / job `105590684074` on exact canonical source `fd77d7e7785c54aae4dcffd5798a2b0ad46537ba`. The runner exposed `Google Chrome 152.0.7977.82`, the updated deterministic P0-072 harness contract passed 59 checks, and then the unchanged existing `project_tools/browser_p1_007_unpacked_integration.js` real-Chrome prerequisite failed with `Runtime.evaluate: Inspected target navigated or closed`. The P0-072 physical step was therefore skipped.

Earlier exploratory runs localized the same Chrome/CDP instability before the reset/restart schedule while the Chromium process itself remained alive. No real Yandex API was used in any attempt.

The full chronology and exact next-evidence requirement are recorded in:

`RESEARCH_P0_072_GITHUB_HOSTED_CHROME_EXECUTION_BLOCKER_2026-09-18_EVIDENCE.md`

This hosted-run blocker is not a product failure verdict and is not physical PASS evidence. A suitable authorized Chrome/Chromium environment must first pass the existing baseline real-Chrome integration control.

## Evidence state after this tranche

Repository state after merging this research tooling can be described only as:

**HARNESS-READY / CURRENT GITHUB-HOSTED EXECUTION BLOCKED / PHYSICAL EXECUTION STILL REQUIRED.**

It must **not** be described as real-Chrome P0-072 PASS until the harness has actually executed against the exact reviewed canonical commit in an environment that first passes the baseline real-Chrome integration control and the resulting physical evidence is recorded.

## Remaining P0-072 boundary

Even a successful local Chrome run does not by itself close P0-072.

Still separately required:

- authorized isolated Yandex upload/destructive unknown/late-settlement evidence;
- exact-object reconciliation under P1-090 where destructive outcome is ambiguous;
- final closure review showing all P0-072 acceptance rows are covered by durable source + deterministic + physical evidence.

P0-076 remains DONE. P1-090 and P1-198 remain ACTIVE. `RELEASE_READINESS.md` remains **NOT READY**.


## Controlling physical execution update — restart identity recovery

This later section supersedes the earlier `CURRENT GITHUB-HOSTED EXECUTION BLOCKED` status above. The earlier chronology remains historical evidence for the runner/controller failure that was subsequently isolated and removed.

### Production recovery gap and bounded invariant

Pinned Chrome for Testing `152.0.7977.64` and the stabilized production-popup controller made the existing P1-007 prerequisite repeatably pass on the GitHub-hosted runner. The P0-072 harness then reached the real restart boundary and exposed a production defect:

- the durable receipt was already bound to exact numeric `downloadId`;
- the same DownloadItem survived full Chromium `SIGKILL` and same-profile restart as `state=interrupted`, `error=CRASH`;
- Chrome retained the exact WebClip `blob:chrome-extension://<runtime-id>/...` URL, filename and size;
- Chrome omitted `byExtensionId` after restart;
- the old unconditional `isOwnExtensionDownload()` filter therefore rejected the exact item and left the receipt pending.

The bounded fix does not remove ownership checking. `WebClipLocalDownloadIdentity` now applies this fail-closed order for a bound receipt:

1. receipt and DownloadItem must have the same valid numeric `downloadId`;
2. if `byExtensionId` is present, only exact equality with `chrome.runtime.id` is accepted and a foreign value is terminally rejected;
3. if `byExtensionId` is absent, fallback requires one unique candidate, `kind=download`, `downloadAdmissionPhase=admitted-unknown`, an exact receipt Blob URL under the current extension origin, and exact equality with DownloadItem `url` or `finalUrl`;
4. missing, foreign, mismatched, prepared-only or ambiguous evidence fails closed.

Deterministic positive/negative controls are in `project_tools/test_p0_048_local_download_identity.js`. They cover correct and foreign `byExtensionId`, absent `byExtensionId` with exact WebClip Blob identity, foreign/different Blob identity, exact numeric binding, admitted receipt state and ambiguity rejection.

### Authoritative exact-candidate run

Transient workflow run:

- run: `35368715503`;
- job: `105677309270`;
- execution head: `5baa40f4d342ed9e05f401fbb08edef41efc2ff4`;
- canonical baseline: `e6cb567b44eeff28a89fc90cc82294bf064bad23`;
- Chrome for Testing: `152.0.7977.64`;
- result: **SUCCESS**.

The transient workflow first overlaid exact candidate runtime/harness files from `GITHUB_SHA` onto the guarded canonical baseline, verified the candidate file hashes, ran syntax and deterministic identity controls, passed the existing P1-007 real-Chrome prerequisite, and then executed the full P0-072 physical protocol.

Exact package/runtime source witnesses emitted by the harness:

- `service-worker.js` SHA-256: `98b9c216a42be23619d04c8ac13bc73e0ff76f57bd431cf48bb29b682f20c0f1`;
- `content.js` SHA-256: `9bc3b42db86d522a05cd261da420771eab721f1767bc13fc28d6b0c32f0ff47a`;
- `manifest.json` SHA-256: `183f1ffa9fc60910c2a0b6122d4c4e71d62c5f097f6954aec9eff4e2b2a1e2fc`;
- copied worker exact: `true`;
- manifest version: `0.9.8`.

Case A proved:

- real automatic Chrome PDF download;
- reset-superseded admitted receipt;
- resume of the same DownloadItem;
- terminal `complete`;
- physical PDF bytes: `38,930,306`;
- receipt retired;
- old Journal generation not resurrected.

Case B proved:

- a second real automatic PDF download and exact numeric receipt;
- reset supersession;
- full Chromium `SIGKILL`;
- independent killed-profile IndexedDB witness before relaunch;
- same-profile/same-extension restart;
- exact DownloadItem restored as `interrupted/CRASH`, `canResume=false`;
- existing production maintenance reconciliation;
- `receiptOutcome=retired-terminal`;
- superseded evidence preserved;
- old Journal generation not resurrected.

Machine-readable result digest:

`sha256:272d85296c3274dab973bca237089e2cc6a31684648e62bee45a179c3a0807df`

### P1-231 candidate identity sync

The same successful job then checked out exact execution head `5baa40f4...` and ran the cross-language S0-E identity engine:

- cases: `201`;
- RPF: `sha256:f53635e2c04222f3cb72c99b5c3673f8f7981f573ab942769efd8de2885ec405`;
- Chrome QCF: `sha256:3715a3453333d3d679a1c1c00a0bab6a02b77c0153f1a4e8d138aa1e8f5a984c`;
- Yandex QCF: `sha256:8d6c9711b4f71b8485b49a6ab68f90bcf62bc74155ae0959dbdc4718648879a1`;
- full RCF: `sha256:4d4d22be60b3f2e94fc24282207889c124c2d726e4070bcab482163f58102f50`;
- BCF: `sha256:9eebcc834fa32bd8fe5f03ef14564f0fc1c169d0308dcc2813941b4f913363ff`;
- cross-language result: `node-python`.

The new RPF binds the physical proof to the changed package/runtime bytes. Evidence-only documentation and removal of the transient workflow do not alter the 33-member package RPF.

### Controlling boundary after PASS

This run closes the local Chrome Case A/Case B physical-evidence gap described by this protocol. It does **not** close P0-072 as a whole and does not authorize release:

- `P0-072 ACTIVE`;
- `P0-076 DONE`;
- `P0-080 ACTIVE`;
- `P1-090 ACTIVE`;
- `P1-146 ACTIVE`;
- `P1-198 ACTIVE`;
- Yandex was not exercised;
- `P1-090` exact-object destructive settlement remains separate;
- manifest remains `0.9.8`;
- release remains **NOT READY**;
- no package, version bump, tag, deploy or GitHub Release was created.
