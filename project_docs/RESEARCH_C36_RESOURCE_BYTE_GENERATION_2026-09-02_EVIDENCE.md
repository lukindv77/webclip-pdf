# C36 compact evidence — same locator/URL, different resource bytes/generation — 2026-09-02

Canonical source baseline: `b6b008dceec0b787ca1283e6c822fcd5f3abddcb`  
Exact `content.js`: `f3ee7b51fe9ee94fdfe36e8a7c99f14a548fdc4e`

## Classification

`L4-REVALIDATED / FINDING + POSITIVE/STABLE-IMG/SAME-URL/SRCSET/BACKGROUND/CACHE-EVICTION/FROZEN/CAUSAL CONTROLS (P0-070, P0-004; P1-003 supporting)`

No new P-code. Registry status/wording unchanged.

## Accepted physical execution

- workflow: `Research C36 resource byte generation`
- run: `33658450070`
- job: `100342779251`
- exact workflow head: `c7ddbbd54b8c83d69b67f312a21a324a2bac211e`
- Chrome: `152.0.7977.64`
- conclusion: `SUCCESS`
- raw receipt commit: `b05278f13e6ea2ba296a59183a0d128c454111ea`
- main result SHA-256: `0e364a58fc95ae41aa74f92c98d26c9272ce5fba029f7b2441f2b9c38932265e`
- cache-eviction result SHA-256: `1d46d8ea5e36f042f1463d5f59944165f9123684dded7ee21272a6e86dd52257`

Durable harnesses:
- `project_tools/research_c36_resource_byte_generation.py`
- `project_tools/research_c36_cache_clear_control.py`

## Fresh matrix

- Stable already-decoded IMG: server changes red→green at the same URL; no second fetch; PDF remains red.
- Same-URL promoted `data-srcset` without cache eviction: no second fetch; PDF remains red.
- CSS background without cache eviction: no second fetch; PDF remains red.
- Frozen admitted red bytes as data URL: zero network dependency; PDF remains red.
- Cache-evicted background: second request receives green bytes and resource report is clean (`loaded=2, failed=0`), but PDF remains red. URL-load success is not final byte-generation proof.
- Cache-evicted same-URL promoted `data-srcset`: second request receives green bytes at the exact same URL; `src`, `srcset`, `currentSrc` and DOM locator remain textually the same, but physical PDF changes from admitted red to green (~21,480 green pixels, 0 red).

Decisive drift PDF SHA-256: `46a0e76673a5d5ecb3f2d5690f2d7a6dc41198fba515a7e965a8093ee1205874`.
Frozen admission PDF SHA-256: `9d0a591a0a1718aef584892f9d67ff4bd95d5a9b2aaa0a2f5772f7eaf73b906a`.

## Ownership

- **P0-070 ACTIVE** — same document/locator/URL crosses a resource-generation boundary before physical PDF; exact admitted save generation is not preserved.
- **P0-004 ACTIVE** — admitted selected red pixels become green in the saved artifact.
- **P1-003 ACTIVE supporting** — `resourceReport.loaded` / URL readiness does not identify the final renderer byte generation.
- **P0-023/P0-079 not exercised** — no PDF retry/cache reuse occurs; C40 remains separate.

HTTP standards distinguish URI/resource identity from a particular representation/version; ETag/validators exist precisely to distinguish versions. snapDOM is retained only as architecture input because it materializes fetched image/background bytes into a capture-owned representation.

Detailed evidence: `RESEARCH_FULL_RESTART_C36_RESOURCE_BYTE_GENERATION_2026-09-02.md`.

Next coordinate after integration: **C37 — Failure / retry / rollback / convergence**.
