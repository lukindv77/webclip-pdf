# C23 virtualized-history evidence receipt — 2026-09-02

Status: **durable exact-evidence receipt**. `RESEARCH_REGISTRY.md` remains the sole current P-owner/status authority.

This receipt accompanies `RESEARCH_FULL_RESTART_C23_VIRTUALIZED_HISTORY_2026-09-02.md` and binds the fresh C23 physical finding to exact source/evidence.

## Exact source baseline

- canonical C23 baseline: `main = 7d0774054d434b4dd897af3a14a51732018c4cb9`;
- exact `content.js` Git blob: `f3ee7b51fe9ee94fdfe36e8a7c99f14a548fdc4e`;
- no C20 retained scrollport is used in the fixture.

## Accepted physical evidence

- workflow run: `33606883094`;
- job: `100172789243`;
- exact accepted workflow head: `355cc40f5d754b45d3da29c69fb466b50e187ef5`;
- browser: Google Chrome `151.0.7922.173`;
- conclusion: **SUCCESS**;
- raw result SHA-256: `67d332fc775670fec9b2c42a4d6952a9f8df948f40d2e8789e246b18211d3964`.

Browser wheel scrolling gradually mounts every logical ID `1…57` through an eight-node virtual pool. At the deepest point the mounted window is `50…57`; after scroll-back it is again `1…8`, while page-side evidence still records every `1…57` as actually mounted/seen.

Current WebClip selection/save after scroll-back produces a physical PDF containing exactly IDs `1…8` and no reached-last sentinel. Test-only static materialization of the exact seen history inside the same selected host produces IDs `1…57`, including the reached-last sentinel, with Exclude/outside controls still omitted.

## Owner reconciliation

No new P-code is allocated. The finding maps directly to **P1-230 ACTIVE**: current mounted DOM/window cannot silently substitute for bounded user-reached logical history. P0-070/P0-080/P0-075 and P1-167 remain supporting generation/authority/boundedness owners. C20 is excluded by fixture design.

## Integrated classification

**C23 — `L4-REVALIDATED / FINDING + POSITIVE/GRADUAL-WHEEL/SCROLL-BACK/RECYCLED-HISTORY/CAUSAL CONTROLS (P1-230)`**.

No Registry wording/status, runtime, manifest/version, release-readiness, build, tag or GitHub Release change occurs. C24 is next.
