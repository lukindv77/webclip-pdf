# Current test and release status

This is the compact current status document. Historical per-checkpoint evidence is in `project_docs/TEST_EVIDENCE.md`.

## Runtime identity

Current source manifest:

- Manifest V3
- version `0.9.8`
- minimum Chrome version `118`

The project documentation may refer to `0.9.9 WIP`; that is not the manifest version and is not a released product version.

## Current automated repository gate

GitHub Actions workflow `Repository integrity` completed **PASS** on commit:

`0025fde7106546d8cf9e03cc7929a2b7b9434658`

The run completed these checks successfully:

- repository/audit consistency checker;
- JavaScript syntax for every tracked `.js` file via `node --check`;
- all current `project_tools/test_*.js` deterministic JavaScript test files;
- Git-first recovery artifact provenance self-test, including clean-clone build/hash/source-commit validation and dirty-tree refusal.

This is a real current-SHA automated gate for those exact checks. It does **not** imply unmanaged/unpacked Chrome execution or real Yandex E2E.

The immediately preceding diagnostic run identified one stale test-harness assertion in `test_p0_014_backup_progress_ux.js`: it still expected the retired large `PRIORITIES_P0_P1_P2.md` table to contain an explicit `P0-014 | REGRESSION` row. Runtime/UI source had not failed that assertion; the test was updated to consume the canonical `AUDIT_REGISTRY.md` default `IMPLEMENTED / RELEASE-REGRESSION` model. The subsequent full gate above passed.

## Historical product gate

Before the later audit/consolidation stream, the historical documented checkpoint was:

- **88/88 JavaScript syntax PASS**
- **74/74 deterministic tests PASS**

Those counts remain historical evidence. They must not be confused with the current Actions gate above because the present workflow discovers the current tracked JavaScript/test files rather than claiming the historical 88/74 cardinalities.

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

Enterprise policy in the historical audit environment blocked normal unpacked-extension loading; the project intentionally did not bypass that policy and therefore did not count it as a PASS. Exact historical environment details are retained in `TEST_EVIDENCE.md` rather than here.

## Release policy

Until the applicable real release QA is completed and an explicit release decision is made:

- do not bump `manifest.json` from `0.9.8` to `0.9.9`;
- do not describe `0.9.9` as released;
- do not create a release build/tag/GitHub Release merely because documentation/audit work advanced;
- do not reinterpret historical gate counts as current reruns.

## Retired QA narrative

The former root `QA_STATUS_0_9_9.md` accumulated many sequential WIP notes and duplicated implementation/test history. It was retirement-compared on 2026-08-29 against this document and `TEST_EVIDENCE.md`.

Unique browser/environment observations were copied into `TEST_EVIDENCE.md`; durable current release constraints remain above. The old narrative was then removed from current `main` and remains recoverable from Git history.
