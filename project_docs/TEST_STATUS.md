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

P0-080 is being implemented in bounded application-generation tranches while keeping same-document application generation distinct from browser `documentId` identity.

The first tranche (PR #262) added `application-generation.js` as a current package member and proved the standalone application-generation primitive. The next durable tranche (PR #263) wired that primitive into production content bootstrap and save admission: WebClip-selected same-origin DOM carries application-generation receipts; `WEBCLIP_GENERATE_PDF` and `WEBCLIP_SEND_PDF_TO_YANDEX` are revalidated immediately before privileged dispatch; detached, untracked, mixed-generation and stale-generation local selection authority fails closed. PR #263 was expected-head squash-merged as `51838511f8869cb80aaa9199ed00a5a809907637`, and post-merge Repository Integrity run `35239611224` / job `105264352083` completed successfully on that exact `main` SHA.

PR #264 additionally bound manual save confirmation to an exact live selection revision and revalidated that revision at privileged dispatch. External `finish` / `download` / `yandex` commands and the internal WebClip Finish control capture confirmation authority; later selection mutation, detachment, application-generation change, mixed-generation state or an unobserved page-world selected-marker mutation cannot silently inherit that confirmation. Automatic `read-later` remains an immediate-admission path rather than inheriting an old dialog confirmation.

PR #265 composed the same-document application-generation primitive into the permission-gated cross-origin frame-agent path. Remote selected DOM now carries its own application-generation receipt and stale/untracked remote application state fails closed before `get-state` / `prepare-print`; browser frame/document identity, remote selection-session ordering and print-operation generation remain separate adjacent owners rather than being folded into P0-080. PR #265 was expected-head squash-merged as `014210517d5c8b0585b3087840686e375074cd6d`; post-merge Repository Integrity run `35249774298` / job `105298975420` completed successfully on that exact `main` SHA.

This deterministic implementation still does **not** close P0-080. Required real unpacked-Chrome navigation/reload/SPA/frame evidence remains pending, and downstream full-document generation authority is owned by P0-070. P0-080 therefore remains **ACTIVE** and release readiness remains **NOT READY**.

## Current P0-070 implementation boundary

P0-070 owns exact full-document generation from command admission through print/cache/download/upload/Journal finalization. The current bounded implementation tranche begins consuming the already-proven P0-080 save receipt in the worker without merging it with browser document identity.

At save-message admission the worker guard retains the exact top-frame `MessageSender.documentId`, tab identity, operation identity and same-document application-generation receipt as separate fields. Before Chromium PDF generation, before and after the provisional render, and around post-print diagnostics, the guard revalidates the admitted document with exact `documentIds` targeting and compares the current isolated-world application-generation receipt. Generation-bound diagnostics are sent to the exact admitted document rather than the tab-wide content-script set. Missing/duplicate/expired admission, subframe admission, same-tab document replacement and same-document application-generation drift fail closed before the guarded stage can be treated as current source authority.

This tranche is intentionally **partial**. It does not yet create the monotonic browser navigation generation needed to prove A→B→A/BFCache races; it does not yet carry one immutable full-document source receipt through PDF cache, local-download/Yandex side-effect settlement and Journal finalization; and it does not close the adjacent P1-171/P1-125/P1-199/P1-200/P1-214/P1-227 owners. P0-070 remains **ACTIVE** pending those downstream handoffs plus required real-browser evidence.

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
