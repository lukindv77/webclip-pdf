# C24 inert disclosure fresh evidence receipt — 2026-09-02

Status: **durable exact-evidence receipt**. `RESEARCH_REGISTRY.md` remains the sole current P-owner/status authority.

## Exact baseline and classification

- canonical tranche baseline: `main = c2f4648cf073070f74c188e7ff9f50d3e30ed05b`;
- `content.js` blob: `f3ee7b51fe9ee94fdfe36e8a7c99f14a548fdc4e`;
- `host-control-activation-guard.js` blob: `5b98e046a69f5389271f626536b02e6f073ca7fb`;
- fresh classification: **`L4-REVALIDATED / FINDING + POSITIVE/GUARDED-ACTIVATION/INERT-STATIC/NAMED-DETAILS/CAUSAL CONTROLS (P0-075, P0-070, P0-004; P1-167 supporting)`**.

No new P-code and no Registry status/wording change.

## Accepted physical evidence

- workflow head: `445866d20f2caec910db6edb853b428524b9d51f`;
- workflow run: `33608253236`;
- job: `100177131433`;
- Chrome: `151.0.7922.173`;
- conclusion: **SUCCESS**;
- persisted raw-result commit: `0b660c772757dcaf363d81771ab574cbec51f22d`;
- primary result SHA-256: `a21f2881112aaac414ab61a7b371c89f3d6fd1eeca0cb9e9e899f5386fbd11d3`;
- named-details result SHA-256: `e38213efecf265e95d756379600396964aa7657ed0821cb479e5c349e43ce78f`.

Fresh production-shaped guard control blocks all four tested page-owned programmatic disclosure clicks (`blockedPageClicks=4`), with page `clicks=[]`, `submits=0` and no stateful click-created content. This keeps **P0-067 DONE** closed and corrects the older unguarded C24 narrative.

Current live native `<details>.open=true` still fires page-observable state change: a fixture `toggle` handler creates `NATIVE_TOGGLE_CREATED_CONTENT`, which enters the physical PDF. Direct fallback also mutates existing ARIA/hidden panels on the live source and those mutations remain after print. The save request exposes no disclosure `sourceState/staticRepresentation` receipt.

A test-only disconnected static representation preserves all tested pre-existing closed-details/panel content while leaving the source native details closed and producing zero page click/submit/toggle-created/stateful-created content. Exclude and outside-shell controls remain omitted.

A standards-driven `<details name="faq">` case proves an additional live-widget completeness failure: current preparation attempts to open both closed group members, browser exclusivity leaves only the second open, and physical PDF contains only the second body. A disconnected archival clone that removes group exclusivity and opens both prints both bodies while source state remains unchanged.

## Owner reconciliation

- **P0-075 ACTIVE** — live hostile page is still being used as the disclosure preparation plane;
- **P0-070 ACTIVE** — post-admission page-created/mutated disclosure state can become the saved generation;
- **P0-004 ACTIVE** — physical consequence includes both admission of post-transition content and loss of a named-details body;
- **P1-167 ACTIVE supporting** — broad disclosure scans/serial waits remain outside a single shared preparation envelope;
- **P1-004 ACTIVE umbrella supporting** — current cross-origin frame-agent still has no disclosure expansion path;
- **P1-212 ACTIVE** is not claimed as a fresh activation leak here because the tested P0-067 guard prevents actual page activation.

Detailed evidence and architecture analysis: `RESEARCH_FULL_RESTART_C24_INERT_DISCLOSURE_2026-09-02.md`.

Durable harnesses:

- `project_tools/research_c24_inert_disclosure.py`;
- `project_tools/research_c24_named_details.py`.

Runtime/version/release state is unchanged. Next sequential coordinate after integration: **C25 — Dialog / popover / top layer**.
