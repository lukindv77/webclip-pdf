# PD7 — exact current Stable negative platform receipt — 2026-09-09

Date: 2026-09-09  
Repository: `lukindv77/webclip-pdf`  
Canonical production baseline: `main = d4f5b268fa3f7ced5a7bc68da52784863d614138`  
Research branch: `research/pd7-single-axis-scroll-stable-2026-09-09`  
Execution commit: `69c7f1afbc35834ec814661e90ea2727a7ba08db`  
Scope: PD7 Change Impact / physical browser evidence only. No production runtime, manifest, Registry status, version, build, tag, release or deployment is changed.

## 1. Question closed by this receipt

The project-wide reconciliation required one of two exact outcomes for the selected current Stable Chrome target:

```text
A. feature detector true -> execute the full PD7 feature-active physical schedule
B. feature detector false -> record an exact current-Stable bounded negative platform receipt
```

This run obtained outcome **B**.

## 2. Exact browser target

Chrome for Testing availability identified the current Stable target as:

```text
Channel: Stable
Version: 153.0.8010.36
Revision: r1681091
Platform: linux64
```

Exact downloaded asset:

```text
https://storage.googleapis.com/chrome-for-testing-public/153.0.8010.36/linux64/chrome-linux64.zip
```

GitHub Actions execution verified:

```text
Google Chrome for Testing 153.0.8010.36
```

Exact download SHA-256:

```text
167a098c4fdec156b58a9f678c90a84f9072d789f9c6e7b35496a6987b8b7ef8
```

Exact Chrome binary SHA-256:

```text
79a4ebf6da53e4ceab11844257aabc5166f17b595dc694d6382cbee8ff50565f
```

## 3. Execution receipt

GitHub Actions:

```text
workflow: PD7 current Stable research receipt
run: 34298764784
job: 102301000234
attempt: 1
runner: ubuntu-24.04
runner image: 20260831.293.1
result: success
```

Exact source commit checked out by the runner:

```text
69c7f1afbc35834ec814661e90ea2727a7ba08db
```

Research dependencies were fixed and recorded:

```text
Python 3.12.14
playwright==1.55.0
pypdf==6.0.0
```

## 4. Exact feature discriminator

Executed by the committed harness:

```js
CSS.supports("named-feature(single-axis-scroll-container)")
```

Actual result on Chrome for Testing Stable `153.0.8010.36`:

```text
false
```

Therefore the new Single-axis scroll containers semantics are **not active in this exact selected Stable build**.

This resolves the prior rollout ambiguity for the project's current Stable target. Major version 153 alone is not treated as feature authority.

## 5. Actual computed/source behavior

Initial computed values:

```json
{
  "innerOverflowX": "auto",
  "innerOverflowY": "hidden",
  "outerOverflowX": "hidden",
  "outerOverflowY": "auto",
  "stickyTop": 426,
  "stickyLeft": 6,
  "innerTop": 423
}
```

After programmatic movement:

```json
{
  "innerLeft": 180,
  "innerTop": 90,
  "outerTop": 6,
  "stickyTop": 420,
  "stickyLeft": 6
}
```

The would-be clipped axis still behaved as the old `hidden` scrollable axis and accepted programmatic `inner.scrollTop = 90`, which is consistent with the feature detector returning false.

## 6. Physical PDF receipt

The runner retained both PDFs before artifact upload.

Harness result:

```text
rawRows = 0
normalizedRows = 40
```

Exact retained PDF SHA-256 values after artifact download:

```text
pd7-raw.pdf
b1b1d68a248ae296eace25abc9f324db807916baff209fa3e55b7469f680376e

pd7-normalized.pdf
5f8a7864c8e5babd096e0d12dff2994580a83de62b7c9e4e924b049b9cef3f97
```

Independent render-first inspection of the retained artifact confirmed:

- raw PDF: one page; `TOP-SPACER`, `STICKY-TOKEN` and `OUTER-TAIL` are visible, while none of `PD7-ROW-001...040` is visible;
- normalized PDF: two pages; rows `PD7-ROW-001...029` are visible on page 1 and `PD7-ROW-030...040` on page 2, with `OUTER-TAIL` following the full row set.

This is strong causal/control evidence for the existing C20/P0-004 selected-scrollport fidelity direction. It is **not** evidence that the new single-axis semantics are active.

## 7. Durable artifact

Uploaded artifact:

```text
name: pd7-current-stable-153.0.8010.36-34298764784-1
artifact id: 10084123959
size: 18798 bytes
retention: 30 days
expires: 2026-10-09T01:20:22Z
artifact digest:
sha256:7ed79182d3f52a76b51ae47141d0468ba9d2447b69d3dc5d7afefdaf396e4947
```

The artifact contains ten files, including exact browser/dependency metadata, JSON receipt, stdout, retained raw/normalized PDFs and GitHub run receipt.

## 8. Correct PD7 classification after this run

Prior state:

```text
PD7 = REVALIDATION-REQUIRED / ROLLOUT-SENSITIVE
```

Current selected-Stable state:

```text
PD7 = CURRENT-STABLE FEATURE-INACTIVE / WATCH
```

Meaning:

- the exact current Stable target has now been physically checked;
- feature-active A-H schedules are **not applicable** to this exact Stable build because the named feature is inactive;
- the platform delta remains WATCH for a later Stable/browser-target Change Impact;
- no implementation PASS is inferred;
- existing P0-004/P1-230/P1-187 findings and acceptance contracts remain unchanged.

The harness field `currentStableRevalidationPass = false` is expected under the harness definition because it only becomes true for a feature-active build whose feature-specific invariants pass. It must not be misread as a failed current-Stable checkpoint.

## 9. Coverage consequence

This receipt satisfies blocker 1 from `RESEARCH_COVERAGE_RECONCILIATION_2026-09-09.md`:

```text
PD7 feature-active/current-target physical revalidation
OR an explicit checkpoint proving the feature is not active in the selected Stable target
```

The second condition is now proven.

Affected coverage interpretation returns to:

```text
C20 = existing current FINDING/controls; no active-Stable PD7 semantic delta
C31 = existing current FINDING/controls; no active-Stable PD7 semantic delta
C22/C23 = P1-230 axis-qualified future acceptance refinement remains WATCH
C29 = future single-axis layout Change Impact remains WATCH
```

No new P-code is allocated.

## 10. Remaining project-wide reconciliation input

The other named reconciliation blocker, C42, has separately been source/model terminalized as:

```text
DETERMINISTIC-COVERED / FINDING (P1-184) + POSITIVE CONTROLS
EXTERNAL-REQUIRED for real Yandex provider checksum/object/public-link semantics
```

Therefore after this PD7 receipt, the project-wide coverage reconciliation may proceed without pretending that the external Yandex L5 boundary is locally verified.

## 11. Evidence ladder

Do not collapse:

```text
exact current-Stable feature-inactive receipt
!= feature-active browser PASS
!= production source-gate PASS
!= implementation closure
!= release readiness
```

## 12. Cleanup

The temporary GitHub Actions workflow used only to obtain this receipt was deleted from the research branch after successful execution. The durable evidence is the GitHub run/job/artifact plus this project evidence document and the committed reusable harness.
