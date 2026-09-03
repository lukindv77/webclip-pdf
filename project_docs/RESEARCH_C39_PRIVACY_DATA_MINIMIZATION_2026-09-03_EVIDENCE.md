# C39 compact evidence — Privacy / data minimization — 2026-09-03

Canonical source baseline: `00871591c4ddea4680e54b03ad05e2390c9f9605`  
Exact `content.js` blob: `f3ee7b51fe9ee94fdfe36e8a7c99f14a548fdc4e`  
Exact `service-worker.js` blob: `cffe46adbd0227bae51c95462d6d705b264838fe`.

## Classification

**`L4-REVALIDATED / FINDING + POSITIVE/PHYSICAL-PDF-TEXT/URI/SELECTION-SNAPSHOT/DURABLE-FLOW/SANITIZED CONTROLS (P0-066, P1-182; P0-045 supporting/source, P0-033 positive)`**.

No new P-code and no Registry wording/status change. `P0-033` remains DONE and is used only as a positive redaction example.

## Accepted physical evidence

- Chrome `151.0.7922.173`;
- workflow run `33713855080`;
- job `100518803841`;
- exact accepted workflow head `100940228d20b942a535c90eb62c1794dabcb59d`;
- conclusion SUCCESS;
- temporary raw-result receipt commit `0d74a4fcea2bd4cb1cf9f2176f0c52bec981abcf`;
- raw result SHA-256 `5374f858d32c0e50a3acaa0b6d1443d86486366b169205a85deee44dde8f56c5`;
- durable harness `project_tools/research_c39_privacy_data_minimization.py`.

The non-accepted run `33713745680` corrected one overbroad assertion: Chromium did not emit the current self-URL-with-fragment as `/URI`; it did render that URL as visible PDF text.

## Fresh matrix

### Physical page URL

The exact `WEBCLIP_GENERATE_PDF` request and extracted physical PDF text both retain synthetic query and fragment secret markers from `location.href`. The one-page PDF remains selected-scope correct.

### Physical selected-link URI

The selected content's synthetic query secret appears in an actual PDF `/URI` annotation. URL privacy therefore covers admitted content links as well as the WebClip metadata header.

### Portable SelectionSnapshot

The actual request snapshot retains six independent markers: selected, parent, previous and next plaintext plus raw selected `href` and excluded-image `src` query strings. Worker sanitization bounds length but retains content.

### Durable flow

The exact-source L2 projection retains synthetic userinfo and query markers in all eight modeled cache/pending/Journal/template/export surfaces; fragment data remains in five raw/export surfaces because current normalization removes only the hash component from derived keys/templates.

### Sanitized causal control

A single test-only origin/path projection removes userinfo/query/fragment from the PDF header, selected link and all modeled durable surfaces while preserving selected content and usable origin/path links. All synthetic secret-marker counts become zero.

## Supporting source boundary

The popup reads persistent backup status before active-tab classification, has no incognito check, and owns the optional host-permission request. This is source support for P0-045 only; real unpacked/private-window behavior remains C46.

## Owner reconciliation

Fresh findings map directly to **P0-066 ACTIVE** and **P1-182 ACTIVE**, with **P0-045 ACTIVE** supporting/source. **P0-033 DONE** remains a positive control. No new P-code is warranted.

## Architecture direction

Keep exact raw URL only as volatile admission authority; use one shared minimized origin/path projection for display/durable/export boundaries; apply it to admitted link targets as well as metadata; replace portable locator plaintext/raw URLs with versioned privacy-preserving fingerprints; and classify incognito before persistent reads or permission flows.

Detailed evidence: `RESEARCH_FULL_RESTART_C39_PRIVACY_DATA_MINIMIZATION_2026-09-03.md`.
