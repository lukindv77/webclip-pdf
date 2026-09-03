# WebClip — fresh full-project research — C45 Later reading / reopened PDF usefulness — 2026-09-03

Date: 2026-09-03  
Current degraded-control source baseline: `e7db9600ad1710c8996fc1d22da42dec7295ab82`  
Exact `content.js` blob: `f3ee7b51fe9ee94fdfe36e8a7c99f14a548fdc4e`  
Scope: fresh-restart coordinate **C45 — Later reading / reopened PDF usefulness**.

## Result

**C45: `L4-REVALIDATED / PARTIAL/FINDING + POSITIVE/PHYSICAL-PDF/TWO-INDEPENDENT-READERS/SELECTED-SCOPE/SEARCHABLE-TEXT/METADATA/EXTERNAL-URI/INTERNAL-DESTINATION/DEGRADED-DIAGNOSTIC CONTROLS + FAILED-RESOURCE-URI-QUERY FINDING; GUI/NATIVE-ACTIVATION-L5 OPEN (P0-066; P1-003 positive; P0-004/P1-187 supporting)`.**

The earlier clean physical-PDF control remains valid. A new exact-current-source run deliberately admitted one broken image, generated a physical PDF and reopened the saved bytes independently with pypdf and PyMuPDF. Both readers confirm selected scope, searchable text, title metadata, the intended external URI, an internal destination and a visible truthful resource-failure warning.

The same physical artifact exposes a confidentiality defect: its visible diagnostic removes the synthetic query token, but both parsers recover the broken image's exact URL with that token from PDF URI annotations. This is fresh physical evidence for existing **P0-066 ACTIVE**, not a new owner.

No runtime, Registry wording/status, manifest or release-state change is made. Manifest remains `0.9.8`; release remains **NOT READY**.

## Accepted degraded-control execution

- workflow: **Research C45 Degraded Resource**;
- run `33755066731`;
- job `100647417146`;
- exact workflow head `daedc5cb95de26dc103a498c0b39d49ed0bf5eb4`;
- canonical source receipt `e7db9600ad1710c8996fc1d22da42dec7295ab82`;
- Chrome `151.0.7922.173`;
- conclusion **SUCCESS**;
- result SHA-256 `1a0f0ef5f8a4f53b33bfaa6dae932e571b821e30591019113eb2e16b8229421f`;
- physical PDF: `32,064` bytes, SHA-256 `a647a28ac104efa29b72b61a6b8685241440ab211ec6b42415e1e81aeedc8fa8`;
- durable harness: `project_tools/research_c45_degraded_resource_truth.py`.

The workflow receipt was rejected until its baseline field was derived from `git merge-base HEAD origin/main`. The accepted result is therefore bound to the canonical main tree rather than to a preceding evidence/receipt commit.

## Reopened-artifact matrix

| Observation | pypdf | PyMuPDF |
|---|---|---|
| physical PDF reopened | PASS | PASS |
| selected marker present | PASS | PASS |
| outside-scope marker absent | PASS | PASS |
| internal target text present | PASS | PASS |
| search phrase extractable | PASS | PASS |
| intended external URI preserved | PASS | PASS |
| internal destination/link | `>=1` | `>=1` |
| document title | `C45 Degraded Resource Reader Title` | same |
| visible resource summary | PASS | PASS |
| visible failed count/detail | PASS | PASS |
| synthetic query token absent from extracted text | PASS | PASS |
| failed-resource URI annotations containing query token | `2` | `2` |

The two parsers agree on the same substantive properties while using independent PDF implementations. The duplicate annotation count is recorded as an artifact observation only.

## Admission and truthful-degradation control

The admitted request contains resource report version 1 with attempted=4, loaded=3, failed=1, omittedByLimit=0, deadlineExceeded=false and scanTruncated=false. The failed item is the intentionally missing image and is classified `image-load-error`.

Current source attaches the resource report before print-header rendering, prints the failed count and bounded failure details, and strips query/fragment material from the diagnostic label. Both reopened readers see the degraded warning and missing path. **P1-003 ACTIVE** is therefore positive for this bounded admitted-failure case; this does not close its broader owner contract.

## Failed-resource URI-query finding

Current `wrapUnlinkedImagesForPdf()` creates a temporary link for an unlinked image with:

1. `const imageUrl = image.currentSrc || image.src;`
2. `link.href = imageUrl;`

That exact failed-resource URL reaches physical PDF URI annotations even though the printed diagnostic uses a sanitized origin/path projection. Both parsers recover the synthetic query-token marker from the URI list, while neither finds it in extracted visible text.

This reconciles directly to **P0-066 ACTIVE**: one durable/display URL sanitizer is not applied to every PDF persistence surface. No Registry wording/status change is required because the current owner already covers query/userinfo minimization across durable/display surfaces.

## B1–B9 mapping

| Boundary | Fresh C45 result |
|---|---|
| B1 User Intent | One explicit selected article defines the saved scope. |
| B2 Admission / exact generation | The request carries exact selected scope and one admitted resource failure. |
| B3 Capture | Selected content is present and the outside marker is absent. |
| B4 Static Materialization | Current preparation renders selected content and a truthful degraded warning. |
| B5 Renderer | Chrome emits a valid physical PDF; it also serializes the unsafe failed-resource URI. |
| B6 Physical Artifact | Exact bytes/hash recorded and reopened by two parsers. |
| B7 Persistence / Transfer | Not the primary boundary in this tranche. |
| B8 Journal / Provenance | Admission resource receipt is checked; full exact-artifact Journal linkage remains governed by C43. |
| B9 Later Reading / Recovery | Text, metadata, intended navigation and degraded warning survive reopening; GUI activation is open. |

## Owner reconciliation

- **P0-066 ACTIVE**: direct finding — the failed-resource query survives in PDF URI annotations.
- **P1-003 ACTIVE**: positive bounded control — admitted resource failure and visible diagnostic agree.
- **P0-004 / P1-187 ACTIVE**: supporting selected-scope/link-fidelity context; neither is closed by this ordinary fixture.

No new P-code, owner-status change or runtime fix is justified by this research-only tranche.

## Remaining C45 exit evidence

1. Open the accepted physical degraded PDF in a real GUI reader and perform actual text selection/search.
2. Activate the intended external link and internal destination through the GUI/native reader path.
3. After remediation under P0-066, prove that the failed-resource target is omitted or query-sanitized while the visible degraded warning remains truthful.
4. Preserve exact artifact/admission linkage when recording those results.

Until those user-owned boundaries are exercised, C45 remains OPEN at L4 partial/finding rather than complete.
