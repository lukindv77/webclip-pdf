# Current test and release status

This is the compact current status document. Historical per-checkpoint evidence is in `project_docs/TEST_EVIDENCE.md`.

## Runtime identity

Current source manifest:

- Manifest V3
- version `0.9.8`
- minimum Chrome version `118`

The project documentation may refer to `0.9.9 WIP`; that is not the manifest version and is not a released product version.

## Last documented product gate

The latest documented completed product gate before the subsequent docs-only audit stream is:

- **88/88 JavaScript syntax PASS**
- **74/74 deterministic tests PASS**

These are **historical proven results, not a test rerun on the current GitHub HEAD**.

The large audit/consolidation stream after that gate has been documentation-only with respect to production runtime in the audited commits, but that fact must not be used to claim the tests were rerun. If a current-head gate is required, the suites must actually be executed again.

## Browser evidence

Historical engineering evidence includes multiple PASS runs on managed Chromium `144.0.7559.96`, covering production selection/print boundaries, selected-only Chromium PDF output, Journal rendering, focused UI regressions and a mocked service-worker Yandex boundary. The exact historical checkpoints and PDF sizes are preserved in `TEST_EVIDENCE.md`.

One specific real Chrome problem-page result is also preserved: the original `its.1c.ru` pagination/clipping reproduction reached a 2-page complete PDF after P1-153.

None of these substitutes for the final release browser/service gate below.

## Release blockers / checks still required

Before claiming a `0.9.9` release or raising the manifest version, the project still requires at minimum:

1. real **unpacked Manifest V3** execution in unmanaged Chrome / suitable Chrome for Testing;
2. real Chrome extension permission UI, including cross-origin optional-host permission grant/deny/revoke and frame navigation/reload scenarios;
3. real Chrome `chrome.debugger` / `Page.printToPDF` path under the actual extension, not only managed harness boundaries;
4. real Chrome automatic download / native Save As / terminal DownloadItem behavior and relevant late-settlement/recovery scenarios;
5. real Yandex OAuth/API E2E for the currently required account/auth/root/capability identity contract;
6. real Yandex upload/move/publish/unpublish/delete/backup/restore behavior, including failure/timeout/unknown-settlement and account/root switching scenarios required by open audit owners;
7. focused regression verification for open P0/P1 owners that affect the release-critical flow.

Enterprise policy in the historical audit environment blocked normal unpacked-extension loading; the project intentionally did not bypass that policy and therefore did not count it as a PASS.

## Release policy

Until the applicable real release QA is completed and an explicit release decision is made:

- do not bump `manifest.json` from `0.9.8` to `0.9.9`;
- do not describe `0.9.9` as released;
- do not create a release build/tag/GitHub Release merely because documentation/audit work advanced;
- do not reinterpret historical gate counts as current reruns.

## Relationship to old QA files

`QA_STATUS_0_9_9.md` is an accumulated historical narrative, not the compact current status. It remains in the repository temporarily because unique details still need a retirement comparison against this file and `TEST_EVIDENCE.md`.

After that comparison proves no unique QA fact would be lost, the old accumulated QA narrative can be retired from current `main` and remain available through Git history.
