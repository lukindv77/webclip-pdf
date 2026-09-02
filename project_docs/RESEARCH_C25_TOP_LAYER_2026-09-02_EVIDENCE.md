# C25 top-layer fresh evidence receipt — 2026-09-02

Status: **durable fresh-restart evidence receipt**. `RESEARCH_REGISTRY.md` remains the sole current P-owner/status authority.

Coordinate: **C25 — Dialog / popover / top layer**.

Canonical researched baseline:

- `main = 6e61f8db7b77737c34a8290cea11bc8b8aff51e6`;
- `content.js` blob `f3ee7b51fe9ee94fdfe36e8a7c99f14a548fdc4e`;
- Google Chrome `151.0.7922.173`.

Fresh classification:

**`L4-REVALIDATED / FINDING + POSITIVE/AUTO-LIGHT-DISMISS/MANUAL/MODAL/CLOSED/FRAME/CAUSAL CONTROLS (P0-075, P0-070, P1-187; P0-004 supporting)`**

## Exact accepted physical receipts

Admission/top-layer case capture:

- run `33610993477`;
- job `100185833170`;
- exact workflow head `040bee0dc466e9dec376405de6e0b48c9f7feb50`;
- SUCCESS;
- raw result SHA-256 `940b81c1b1ae52c0e7e1808e84daaa10e27605a36d4510989f758192d1fc732f`.

Final corrected controls / same-origin parity:

- run `33611864788`;
- job `100188651541`;
- exact workflow head `c2bea7a0bf0d0454d55cb23ca570e0134cff44ad`;
- SUCCESS;
- raw result SHA-256 `1af09abbf1b44d257dc420d55a84791874c341506d81e644541a02fa4de8cc48`.

## Fresh observations

1. Open selected `popover=auto` is physically printable with its blue backdrop when no trusted WebClip review click intervenes (`token=true`, about `369139` blue pixels).
2. The real trusted WebClip `Готово` click is outside that auto popover and light-dismisses it. The popover changes `true -> false`, remains closed through preparation, and the resulting physical PDF lacks the selected token/backdrop while save proceeds. This maps to existing **P0-075 / P0-070**, with **P0-004** physical consequence.
3. `popover=manual` survives the same trusted WebClip Finish click and physically prints with backdrop — positive control.
4. A real `dialog.showModal()` keeps `open=true` / `:modal=true` but makes WebClip's same-document Finish UI inert; trusted click does not activate it. A test-only forced prepare prints the selected dialog/backdrop, proving renderer capability. This is existing **P0-075** control-plane/isolation ownership, with P0-070 supporting exact admitted-operation generation.
5. Corrected closed-state negative control keeps a closed popover and closed dialog closed and absent from PDF.
6. Correctly registered Exclude inside an open manual popover becomes `display:none` and is absent from the physical PDF. An earlier apparent top-layer Exclude leak is explicitly rejected as a harness artifact because `excludeCount` had been zero.
7. Same-origin selected BODY flattening starts with source popover `:popover-open=true`, creates a final proxy containing the popover but with `:popover-open=false`; copied used `display:block` retains text, but blue backdrop drops from native direct-child `472830` pixels to `0`. Test-only `showPopover()` on the connected final proxy restores about `388963` blue pixels while Exclude remains omitted. This freshly revalidates existing **P1-187 ACTIVE**.

## Root-cause decision

No new P-code is warranted.

- **P0-075 ACTIVE** — WebClip trusted operation UI/control plane must not be changed/disabled by host top-layer interaction; admitted browser state must be isolated before UI side effects.
- **P0-070 ACTIVE** — save remains bound to exact admitted document/presentation generation through render.
- **P1-187 ACTIVE** — same-origin flattened secondary representation must preserve required browser/renderer-owned state under budget; top-layer/backdrop is another manifestation.
- **P0-004 ACTIVE** supports the physical selected-copy consequence.

P0-067 remains DONE. P1-004 remains the cross-origin umbrella. No Registry wording/status transition is made.

## Architecture direction

Capture admitted top-layer presentation before WebClip review/save UI can light-dismiss or otherwise alter it. Use a WebClip-owned inert/static representation for renderer output, and isolate trusted operation controls from page modality. Do not replay page interaction or live modality merely to serialize a static PDF.

Detailed proof and external standards comparison are in `RESEARCH_FULL_RESTART_C25_TOP_LAYER_2026-09-02.md`.

Runtime source, manifest/version, build/tag/Release and release readiness remain unchanged.
