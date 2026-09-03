# WebClip — fresh full-project research — C45 Later reading / reopened PDF usefulness — 2026-09-03

Date: 2026-09-03  
Canonical source baseline: `22b13604c71b2c46e846850405a339cee7bdbff8`  
Exact `content.js` blob: `f3ee7b51fe9ee94fdfe36e8a7c99f14a548fdc4e`  
Scope: fresh-restart coordinate **C45 — Later reading / reopened PDF usefulness**.

## Result

**C45: `L4-REVALIDATED / PARTIAL/PASS + POSITIVE/PHYSICAL-PDF/TWO-INDEPENDENT-READERS/SELECTED-SCOPE/SEARCHABLE-TEXT/METADATA/EXTERNAL-URI/INTERNAL-DESTINATION CONTROLS; DEGRADED-RESOURCE/GUI-L5 OPEN (P0-004, P1-003, P1-187, P0-066 candidate/supporting map)`.**

A physical PDF produced after the current WebClip selection/download preparation was reopened independently by pypdf and PyMuPDF. Both readers recovered the selected marker and search phrase, rejected an outside-scope marker, preserved the document title, preserved the external link URI and observed an internal PDF destination. This is direct positive evidence that an ordinary admitted selected artifact remains useful after reopening, not merely that Chromium finished `printToPDF`.

The accepted request had a clean resource report (`3/3` loaded, zero failed/omitted, no deadline or scan truncation). Consequently C45 remains partial: truthful degraded-resource information was not exercised, and no manual GUI reader/text-selection interaction was performed.

No fresh root-cause failure was discovered in this tranche. No new P-code is warranted. Existing ACTIVE owners are neither closed nor reopened; the candidate map remains supporting context only.

Runtime, Registry wording/status, manifest `0.9.8` and release readiness are unchanged; release remains **NOT READY**.

## Accepted exact-source execution

- Google Chrome `151.0.7922.173`;
- workflow run `33725415471`;
- job `100553189070`;
- exact workflow head `637f0c5f1b327c29fc070e011cc7f1679acd64ee`;
- conclusion **SUCCESS**;
- result SHA-256 `818d9b155a970300f5d55da527030f7b861e8df471362a5036ca18adc03e2bcc`;
- physical PDF SHA-256 `48c9c910e2d009ecd009392e34e9c085ea835a18e1d25b5780841ed8c20978d3`;
- durable harness `project_tools/research_c45_reopened_pdf_usefulness.py`.

## Physical later-reading matrix

| Observation | pypdf | PyMuPDF |
|---|---|---|
| selected marker present | PASS | PASS |
| outside-scope marker absent | PASS | PASS |
| internal target text present | PASS | PASS |
| search phrase extractable | PASS | PASS |
| external URI preserved | PASS | PASS |
| internal destination/link | `>=1` | `>=1` |
| title metadata | `C45 Reader Metadata Title` | same |

The physical artifact was 26,692 bytes. The independent parsers agree on the substantive later-reading properties while using different PDF implementations.

## Selected-scope control

The source fixture placed `C45_OUTSIDE_SCOPE_MARKER_9B2D` outside the selected `article`. The admitted selected article contained `C45_SELECTED_SEARCHABLE_MARKER_7C1A`, a searchable sentence, external link and an internal anchor target. After the current content-script preparation, both reopened PDF parsers found the selected marker and did not find the outside marker.

This is a direct positive B6/B9 control for selected-scope usefulness. It does not erase earlier fidelity findings under P0-004/P1-187; it proves this bounded ordinary case survives into the reopened artifact.

## Searchable text / metadata

Both readers extracted `independent reopened reader verification` as text. That establishes machine-readable/searchable text in the resulting PDF for this ordinary selected content. Both also recovered the document Title `C45 Reader Metadata Title`.

This is stronger than a raster-only visual check, but does not substitute for manual GUI selection ergonomics or accessibility semantics.

## Link usefulness

Both readers recovered the exact external URI `https://example.com/c45-external?marker=keep-path`. Both also observed at least one internal PDF destination/link corresponding to the selected document's `#target` anchor.

The run therefore supplies fresh positive B9 evidence that ordinary external and internal navigation survive reopening. It does not close the broader P1-187 link/fidelity owner because C15 has already shown wider link cases and current owner authority remains canonical in the Registry.

## Resource/degradation boundary

The exact generation request carried `resourceReport` version 1 with attempted=3, loaded=3, failed=0, omittedByLimit=0, deadlineExceeded=false and scanTruncated=false. No degraded-resource condition existed.

Accordingly the harness records `degradedResourceSignalPresentInRequest=false`. That is a scope boundary, not a failure: the research deliberately refuses to claim that degraded-resource information is truthful without a physical degraded case.

A C45 exit tranche still needs an admitted operation with an intentionally unavailable/omitted visual resource whose degradation receipt is carried truthfully into the user-visible artifact/provenance and remains understandable after reopening.

## B1–B9 mapping

| Boundary | Fresh C45 result |
|---|---|
| B1 User Intent | One explicit selected article defines the intended saved scope. |
| B2 Admission / exact generation | Current WebClip request records one selected top-document article and exact source URL/title. |
| B3 Capture | Selected marker/text/link targets are captured; outside marker is not admitted. |
| B4 Static Materialization | Current content preparation produces printable selected representation. |
| B5 Renderer | Chromium emits a valid 26,692-byte PDF. |
| B6 Physical Artifact | Exact SHA-256 recorded; both PDF parsers reopen the same bytes. |
| B7 Persistence / Transfer | Not the primary boundary in this tranche. |
| B8 Journal / Provenance | Clean resourceReport is present in the admitted request; no degraded case was exercised. |
| B9 Later Reading / Recovery | Two independent readers recover selected text, metadata and external/internal navigation. |

## Owner reconciliation

- **P0-004 ACTIVE** remains a candidate/supporting fidelity owner; this ordinary selected-scope case is positive only.
- **P1-003 ACTIVE** remains a candidate/supporting resource-readiness/degradation owner; the clean resource case does not close it.
- **P1-187 ACTIVE** remains a candidate/supporting PDF fidelity/link owner; this bounded reopened-reader control is positive only.
- **P0-066 ACTIVE** remains a candidate/supporting confidentiality owner; the external URI here is synthetic and intentionally non-secret.

No owner status or wording changes are justified.

## Remaining C45 exit evidence

1. generate a physical PDF from an admitted operation with a deliberately unavailable/omitted resource and a truthful degradation receipt;
2. reopen the saved artifact independently and prove the user can distinguish complete vs degraded output without relying on transient extension UI;
3. exercise a real GUI reader for text selection/search and link activation, without substituting parser extraction for user interaction;
4. preserve the exact artifact hash/admitted operation linkage when recording that later-reading result.

Until those boundaries are covered, C45 remains OPEN at L4 partial rather than being declared complete.