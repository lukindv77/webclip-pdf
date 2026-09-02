# C33 compact evidence — CSS/WAAPI animations/transitions — 2026-09-02

Canonical source baseline: `72a2efc2ca298b623d5650d44f8430163f0aa876`  
`content.js`: `f3ee7b51fe9ee94fdfe36e8a7c99f14a548fdc4e`  
`pdf-print-guard.js`: `423c79143df37a80fbabf8cbbf7570a4a2ca4e2a`

## Classification

`L4-REVALIDATED / FINDING + POSITIVE/CSS/WAAPI/TRANSITION/PAUSED/FROZEN/FRAME/CAUSAL CONTROLS (P0-070, P1-187; P0-075 supporting)`

No new P-code. Registry status/wording unchanged.

## Accepted physical execution

- workflow: `Research C33 CSS WAAPI temporal`
- run: `33650829793`
- job: `100317097988`
- exact workflow head: `eea937d13bc5eb66a930a530c624d5f44e649845`
- Chrome: `151.0.7922.173`
- conclusion: `SUCCESS`
- raw receipt commit: `4accce00793aa581b13742a63739676a173772d6`
- result SHA-256: `29d5a8cbda55f1edcc2a7e91150a94a8029aa5a429050af73026a2f22c5b2388`

## Primary fresh observations

- CSS animation: admission ratio `~2.1333` -> pre-print `~3.5832` -> PDF `~3.6949`.
- WAAPI: admission `~2.1332` -> pre-print `~3.2832` -> PDF `~3.3390`.
- CSS transition: admission `~2.1332` -> pre-print `~3.2666` -> PDF `~4.5763`.
- test-only frozen CSS state: admission/pre-print `2.1`, PDF `~2.1356`.
- paused CSS state: admission/pre-print `~2.1166`, PDF `~2.1525`.
- actual save metadata: `temporalMetaPaths=[]` in all cases.
- same-origin frame source has one running WAAPI animation and non-zero sampled transform; flattened proxy has `animationCount=0`, `transform=none`, PDF temporal ratio `0`.
- applying only the admitted sampled transform to the final proxy changes proxy ratio `0 -> ~0.6334`; physical PDF becomes `~0.6441`, proving temporal displacement can be materialized in the final representation.

## Ownership

- **P0-070 ACTIVE** — primary top-document temporal admission-to-render generation owner.
- **P1-187 ACTIVE** — primary flattened-frame temporal rendered-state owner.
- **P0-075 ACTIVE** — supporting isolation/trust boundary; live-host blanket pause is not an acceptable authority model.
- P0-004/P1-003 remain adjacent but are not newly revalidated by the focused C33 fixture.

## Source interpretation

Current render guard disables page script execution around `Page.printToPDF`, but current source has no `getAnimations()`/`currentTime` admission snapshot or final temporal materialization. Disabling script execution is therefore not equivalent to freezing CSS/WAAPI/transition timelines.

Detailed evidence: `RESEARCH_FULL_RESTART_C33_CSS_WAAPI_TEMPORAL_2026-09-02.md`.

Next coordinate after integration: **C34 — Animated image/GIF frame**.
