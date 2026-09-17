# Current test and release status

This is the compact current status document. Historical per-checkpoint evidence is in `project_docs/TEST_EVIDENCE.md`.

## Runtime identity

Current source manifest:

- Manifest V3
- version `0.9.8`
- minimum Chrome version `118`

The project documentation may refer to `0.9.9 WIP`; that is not the manifest version and is not a released product version.

## Current automated repository gate

GitHub Actions workflow `Repository integrity` is the current automated gate for an exact commit/PR head. It runs:

- repository/research consistency checker;
- release-readiness schema/status validation (`NOT READY` is valid WIP state);
- JavaScript syntax for every tracked `.js` file via `node --check`;
- all current `project_tools/test_*.js` deterministic JavaScript test files;
- Git-first recovery artifact provenance self-test, including clean-clone build/hash/source-commit validation and dirty-tree refusal.

**Do not use a SHA embedded in this document as current CI authority.** CI truth is commit-scoped: before merge/release, query GitHub Actions for the exact candidate/head SHA and require that exact run to be successful.

The repository-hygiene PR immediately preceding this policy change demonstrated the intended process: exact PR head CI PASS, expected-head merge, then a separate post-merge PASS on resulting `main`. That is process evidence, not a permanent current-SHA claim.

## Current P0-080 implementation evidence

The first bounded P0-080 implementation tranche adds the application-generation runtime primitive as a current package member. Its deterministic model proves 27 checks covering immutable generation receipts, URL-change generation advancement, unchanged-URL stability, hash/history transitions and stale-receipt mismatch. The package-topology census explicitly admits 34 current package files including `application-generation.js`.

This evidence does **not** prove save admission or P0-080 closure. The primitive is intentionally not yet wired into selection/save authority in this tranche. Receipt consumption, save confirmation, disconnected/mixed selection revalidation, remote-frame/downstream generation composition, and the required real unpacked-Chrome evidence remain pending. P0-080 therefore remains **ACTIVE** and release readiness remains **NOT READY**.

## Historical product gate

Before the later research/consolidation stream, the historical documented checkpoint was:

- **88/88 JavaScript syntax PASS**
- **74/74 deterministic tests PASS**

Those counts remain historical evidence. They must not be confused with a current Actions run because the present workflow discovers the current tracked JavaScript/test files rather than claiming historical cardinalities.

## Browser evidence

Historical engineering evidence includes multiple PASS runs on managed Chromium `144.0.7559.96`, covering production selection/print boundaries, selected-only Chromium PDF output, Journal rendering, focused UI regressions and a mocked service-worker Yandex boundary. The exact historical checkpoints and PDF sizes are preserved in `TEST_EVIDENCE.md`.

One specific real Chrome problem-page result is also preserved: the original `its.1c.ru` pagination/clipping reproduction reached a 2-page complete PDF after P1-153.

Current focused C44 evidence adds real unpacked Chrome `152.0.7977.54` local Journal controls. Run `33790752301` proves SHA-256 preview binding, stale-revision fail-closed behavior and clean import. The newer run `33825545613` (job `100877305863`, head `77cbd3bcc325dd57542993f94b85f7a08c8245da`) proves durable renewable lease ownership across two full browser restarts: no automatic destructive resume, explicit token/owner rotation and revalidation, rejection of the previous token without Journal/staging loss, a second confirmation before successful commit, and an explicit cancel that preserves Journal/pending state while removing only checkpoint/staging. This closes P1-215. No remote account, credentials or native Save As UI were used; P0-072 checkpoint reconciliation and native/remote release boundaries remain open.

None of these substitutes for the final release browser/service gate below.

## Release readiness

`project_docs/RELEASE_READINESS.md` is the machine-readable current declaration. Current state is intentionally **NOT READY**.

`.github/workflows/release-gate.yml` is a separate manual, read-only, fail-closed pre-release gate. It evaluates an exact candidate SHA/version and does not create a build/tag/GitHub Release.

Before claiming a `0.9.9` release or raising the manifest version, the project still requires at minimum:

1. real **unpacked Manifest V3** execution in unmanaged Chrome / suitable Chrome for Testing;
2. real Chrome extension permission UI, including cross-origin optional-host permission grant/deny/revoke and frame navigation/reload scenarios;
3. real Chrome `chrome.debugger` / `Page.printToPDF` path under the actual extension, not only managed harness boundaries;
4. real Chrome automatic download / native Save As / terminal DownloadItem behavior and relevant late-settlement/recovery scenarios;
5. real Yandex OAuth/API E2E for the currently required account/auth/root/capability identity contract;
6. real Yandex upload/move/publish/unpublish/delete/backup/restore behavior, including failure/timeout/unknown-settlement and account/root switching scenarios required by open research owners;
7. focused review/regression verification for open P0/P1 owners that affect the release-critical flow;
8. explicit release decision with durable evidence reference.

Enterprise policy in the historical research environment blocked normal unpacked-extension loading; the project intentionally did not bypass that policy and therefore did not count it as a PASS. Exact historical environment details are retained in `TEST_EVIDENCE.md` rather than here.

## Release policy

Until the applicable real release QA is completed and an explicit release decision is made:

- do not bump `manifest.json` from `0.9.8` to `0.9.9` merely because research/docs advanced;
- do not describe `0.9.9` as released;
- do not create a release build/tag/GitHub Release merely because deterministic CI is green;
- do not reinterpret historical gate counts as current reruns;
- `Release gate` must remain manual/read-only and fail closed when readiness evidence is incomplete.

## Retired QA narrative

The former root `QA_STATUS_0_9_9.md` accumulated many sequential WIP notes and duplicated implementation/test history. It was retirement-compared on 2026-08-29 against this document and `TEST_EVIDENCE.md`.

Unique browser/environment observations were copied into `TEST_EVIDENCE.md`; durable current release constraints remain above. The old narrative was then removed from current `main` and remains recoverable from Git history.
