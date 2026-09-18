# P0-072 — GitHub-hosted Chrome physical execution blocker evidence

Date: 2026-09-18

Owner: `P0-072 ACTIVE`.

Canonical runtime source tested: `fd77d7e7785c54aae4dcffd5798a2b0ad46537ba`.

Manifest version on that canonical source: `0.9.8`.

Release status remains **NOT READY**. This evidence changes no version, package, tag, deploy, GitHub Release or release-readiness gate.

## Result

**NO PHYSICAL PASS IS CLAIMED.**

The current GitHub-hosted execution environment did not satisfy the prerequisite needed to use it as P0-072 real-Chrome evidence. On `ubuntu-24.04`, the runner exposed:

```text
Google Chrome 152.0.7977.82
```

The final controlled attempt proved that the existing canonical real-Chrome integration control itself fails with:

```text
Error: Runtime.evaluate: Inspected target navigated or closed
```

before the P0-072 reset/restart harness is allowed to execute. Therefore this environment cannot currently distinguish a P0-072 product failure from a more basic Chrome/CDP extension-page/tab-control failure.

This is a physical-execution blocker, not evidence that P0-072 passed or failed.

## Safety boundary

All attempts were intentionally local/synthetic:

- exact canonical repository source was checked out before execution;
- the P0-072 harness uses synthetic localhost article content and a disposable Chrome profile;
- the existing P1-007 prerequisite control rewrites its disposable-copy Yandex API base to the localhost fixture;
- no Yandex OAuth token was supplied;
- no real Yandex API or destructive Yandex action was performed;
- no package/release build, version bump, tag, deploy or GitHub Release was performed.

P1-090 exact-remote-object settlement remains a separate ACTIVE boundary and is not exercised by this evidence.

## Execution chronology

### Initial branch workflow — source-contract drift, no physical scenario

Run `35338396887`, job `105578484756`:

- checkout reached exact canonical `fd77d7e7785c54aae4dcffd5798a2b0ad46537ba`;
- runner exposed Chrome `152.0.7977.82`;
- execution stopped before the physical scenario because the research harness still expected the older direct recovery call;
- current production recovery uses `finalizeForMaintenance(...)`, which delegates to `finalizePendingLocalDownload(...)`.

This identified a research-harness source-contract drift, not a product runtime failure.

The branch repair updates the source contract to the current production recovery wrapper and makes the deterministic harness test invoke `sourceContract()` directly, so future source drift fails the ordinary repository gate.

### P0-072 exploratory physical attempts

Run `35341061217`, job `105586823809`:

- exact canonical checkout succeeded;
- deterministic P0-072 harness contract passed `59` checks;
- Chrome `152.0.7977.82` was present;
- physical harness timed out waiting for the first observed/paused DownloadItem.

Run `35341346310`, job `105587713155`, and run `35341486148`, job `105588160543`:

- exact-source/static prerequisites passed;
- both failed with `Runtime.evaluate: Inspected target navigated or closed`.

Run `35341763820`, job `105589035058` added stage diagnostics:

- controller attached successfully;
- browser process remained alive (`exitCode=null`, `killed=false`);
- failure localized before the physical download/reset schedule, at `case-a-create-tab`;
- browser stderr contained only headless runner DBus/UPower diagnostics, not a Chromium process crash.

Run `35341932035`, job `105589560471`:

- browser remained alive;
- controller execution context became unavailable immediately after the production options-page attach.

Run `35342110814`, job `105590143264` used an inert research-only extension-origin controller to separate the controller from production options-page lifecycle:

- controller attach and `chrome.downloads.onCreated` observer installation succeeded;
- synthetic article creation, load and `content.js` injection succeeded;
- the Chrome messaging boundary failed at selection start with the same `Runtime.evaluate: Inspected target navigated or closed`;
- the browser process remained alive.

These exploratory diagnostic variants are not themselves the canonical physical protocol and are not retained as physical PASS evidence.

### Decisive baseline control

Run `35342277067`, job `105590684074`:

- exact canonical checkout `fd77d7e7785c54aae4dcffd5798a2b0ad46537ba` succeeded;
- deterministic P0-072 harness contract passed `59` checks;
- Chrome `152.0.7977.82` was present;
- **before** the P0-072 physical harness, the unchanged existing canonical `project_tools/browser_p1_007_unpacked_integration.js` was executed as a prerequisite control;
- that baseline control failed with `Runtime.evaluate: Inspected target navigated or closed`;
- GitHub Actions therefore correctly skipped the P0-072 physical step.

This is the strongest blocker evidence: the current hosted runner cannot pass the repository's existing generic real-Chrome extension integration control, so it is not a valid environment from which to claim P0-072 reset/restart physical evidence.

## Workflow / repository-hygiene result

The exploratory branch used a temporary GitHub Actions workflow only to probe whether the hosted runner could supply the required physical environment. That workflow is **not** part of the merge candidate.

Repository Integrity run `35342695323` proved the canonical hygiene rule: only the approved permanent workflows `repository-integrity.yml` and `release-gate.yml` may remain in the mergeable tree. A third physical-evidence workflow is rejected as temporary/unapproved infrastructure. The temporary P0-072 workflow was therefore removed before merge review; Repository Integrity run `35342792966` subsequently passed repository growth hygiene. The merge candidate therefore contains no `.github/workflows` change.

This means future P0-072 physical execution must use one of the existing authorized protocol paths without adding a permanent workflow merely for evidence collection:

- execute `project_tools/research_p0_072_real_chrome_reset_restart.js` in an authorized local/self-hosted environment against one exact canonical `main` SHA; or
- use a transient research-only execution mechanism that is fully removed before any merge candidate is reviewed.

In either case, the evidence run must first pass the unchanged existing P1-007 real-Chrome integration prerequisite, then the deterministic P0-072 harness contract, and only then the P0-072 physical reset/restart harness. No permanent workflow, package, release, tag, deploy or Yandex-destructive path is introduced by this tranche.

## Required next evidence

P0-072 local-download physical evidence remains outstanding until an authorized environment can satisfy all of the following on one exact canonical main SHA:

1. the existing real-Chrome integration prerequisite passes;
2. the P0-072 deterministic harness contract passes;
3. the production automatic PDF download creates the real DownloadItem and reaches the exact durable `admitted-unknown` receipt;
4. production Journal clear preserves and supersedes that receipt;
5. the same exact DownloadItem reaches late terminal settlement without old-generation Journal resurrection;
6. a second reset-superseded receipt survives full Chromium `SIGKILL`, same-profile restart and same extension id;
7. existing production maintenance reconciles terminal or permanently unknown Chrome truth without fabricating Journal success;
8. machine-readable result, Chrome version, exact source SHA and relevant receipt/download ids are retained as durable evidence.

An authorized local or self-hosted Chrome/Chromium environment may execute the protocol command from `RESEARCH_P0_072_REAL_CHROME_RESET_RESTART_PROTOCOL_2026-09-18_EVIDENCE.md` if the GitHub-hosted baseline continues to fail. Deterministic/source-model evidence must not be substituted for these physical observations.

## Owner boundary after this evidence

No owner status changes:

- `P0-072 ACTIVE` — local Chrome physical evidence remains blocked/outstanding and authorized external-effect evidence is still incomplete;
- `P0-076 DONE` — local Journal CAS authority remains closed;
- `P1-090 ACTIVE` — exact destructive Yandex object settlement remains separate;
- `P1-146 ACTIVE` — exact Chrome automatic-download start/late-settlement/restart semantics remain separate;
- `P1-198 ACTIVE` — physical live operation identity remains worker-issued.

Release readiness remains **NOT READY** and the manifest remains `0.9.8`.


## Superseding execution update

This document remains the historical record of the original hosted-run blocker. It is no longer the controlling current execution status.

Subsequent work pinned Chrome for Testing `152.0.7977.64`, corrected controller/injection drift and popup readiness handling, and made the unchanged P1-007 real-Chrome prerequisite pass on the GitHub-hosted runner. The hosted environment then executed the complete P0-072 Case A/Case B protocol against the bounded restart-identity runtime candidate.

Authoritative combined run `35368715503` / job `105677309270` on exact head `5baa40f4d342ed9e05f401fbb08edef41efc2ff4` completed **SUCCESS**, including:

- deterministic local-download identity controls;
- P1-007 real-Chrome prerequisite;
- real automatic PDF late completion;
- full Chromium `SIGKILL` and killed-profile receipt witness;
- same-profile restart with exact `interrupted/CRASH` DownloadItem;
- production maintenance retirement of the reset-superseded receipt;
- zero old-generation Journal resurrection;
- exact-head P1-231 S0-E candidate identity witness.

The controlling detailed evidence and remaining owner boundary are recorded in `RESEARCH_P0_072_REAL_CHROME_RESET_RESTART_PROTOCOL_2026-09-18_EVIDENCE.md`.

The original blocker conclusion is therefore superseded as follows:

**GITHUB-HOSTED PINNED CFT EXECUTION PROVEN / LOCAL CASE A+B PHYSICAL PASS / YANDEX AND P1-090 BOUNDARY STILL OPEN / RELEASE NOT READY.**
