# P0-072 — real Chrome local-download reset/restart physical evidence protocol

Date: 2026-09-18

Canonical implementation baseline reviewed: `0aedf04740d19b0f5ae40580a5df9282d47594d4`.

Post-merge Repository Integrity on that exact main: run `35336815211`, **SUCCESS**.

Owner: `P0-072 ACTIVE` — bulk Journal clear/replace must not erase reconciliation authority for an already admitted non-cancellable external effect.

This tranche adds **research tooling only**. It changes no production runtime, manifest, permissions, release gate, owner status, build, tag, deploy, Chrome user data or Yandex state.

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

## Evidence state after this tranche

Repository state after merging this research tooling can be described only as:

**HARNESS-READY / PHYSICAL EXECUTION STILL REQUIRED.**

It must **not** be described as real-Chrome P0-072 PASS until the harness has actually executed against the exact reviewed commit and the resulting physical evidence is recorded.

## Remaining P0-072 boundary

Even a successful local Chrome run does not by itself close P0-072.

Still separately required:

- authorized isolated Yandex upload/destructive unknown/late-settlement evidence;
- exact-object reconciliation under P1-090 where destructive outcome is ambiguous;
- final closure review showing all P0-072 acceptance rows are covered by durable source + deterministic + physical evidence.

P0-076 remains DONE. P1-090 and P1-198 remain ACTIVE. `RELEASE_READINESS.md` remains **NOT READY**.
