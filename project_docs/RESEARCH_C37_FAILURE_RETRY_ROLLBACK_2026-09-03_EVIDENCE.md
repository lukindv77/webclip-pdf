# C37 compact evidence — failure / retry / rollback / convergence — 2026-09-03

Canonical source baseline: `a6be4cfdb7a3affd385479f04d333e75847ee94c`  
Exact `content.js` blob: `f3ee7b51fe9ee94fdfe36e8a7c99f14a548fdc4e`.

## Classification

**`L4-REVALIDATED / FINDING + POSITIVE/CLEAN-RETRY/STALE-RESOURCE/DETACHED-LINK/WRAPPER-TOPOLOGY CONTROLS (P1-218, P1-219, P1-221; P1-199, P1-214 supporting/source)`**.

No new P-code and no Registry wording/status change.

## Accepted physical evidence

- Chrome `151.0.7922.173`;
- workflow run `33702598102`;
- job `100484895616`;
- exact accepted workflow head `f5516c6f33e379d3fb9f99c0dcf666bda208d441`;
- conclusion SUCCESS;
- raw result receipt commit `e2b688228468203cee291b1fa221c7db755d45cd`;
- raw result SHA-256 `206ee2c9991f20864bc9f24e6c34fcbdd4e74e59c4d60914b58c137c4f9ddc36`;
- durable harness `project_tools/research_c37_failure_retry_rollback.py`.

## Fresh matrix

### Clean retry — positive control

First mocked PDF attempt fails after preparation. Cleanup returns header/print-style/image-wrapper/href-marker counts to zero. A second prepare prints selected content correctly; Exclude/outside remain absent; successful cleanup again returns all counters to zero.

Retry PDF SHA-256: `4ae663a66afe6f0d77fc232066cbb5fa008ea43a187c3222f1a9cc44f35e05fb`.

### P1-218 stale resource rollback

- original IMG `src = null`;
- WebClip promotes red `data-src`;
- host supersedes it with blue `src`;
- failure cleanup restores old absence (`null`), overwriting newer host state;
- retry promotes red again;
- physical retry PDF: `7,920` red pixels, `0` blue.

PDF SHA-256: `f333747945bbbf00bbcc7453a219b7892324e799f78eacdf1c30427b284a4ec9`.

### P1-221 detached-link retry drift

With `<base href="https://example.test/base/">`, authored `relative/item` is normalized to an absolute href during prepare. The exact link is detached before failure, so cleanup skips it and forgets the parent receipt. After reattachment, retry snapshots the temporary absolute href as the new original; final cleanup removes the marker but leaves the href absolute. The authored relative identity is lost.

PDF SHA-256: `ab5342c3e2919783162c969212e1a4e647f8c0d99176168618e4e51ad2efe771`.

### P1-219 wrapper topology loss

A page-owned `<em>` child appended inside WebClip's generated image wrapper before failure becomes disconnected when cleanup moves the image back and removes the wrapper. Exact wrapper ownership is not ownership of newer page descendants.

## Source-level supporting convergence boundaries

Fresh current source still contains both:

- `restoreAfterPrint()` starting `restoreRemoteFramesAfterPrint().catch(() => {})` fire-and-forget;
- `prepareForPrint()` then awaiting a second `restoreRemoteFramesAfterPrint()` call.

The first call can synchronously consume shared rollback bookkeeping before actual child RPC settlement, so P1-199/P1-214 remain supporting current source boundaries. This C37 tranche does not claim a fresh physical remote-frame reproduction.

## Rejected harness provenance

Run `33701899042` failed on a harness-only link assumption because the first synthetic link fixture lacked a base URL; it produced no accepted raw JSON. Case-isolation run `33702064714` separated the valid product observations. The final standalone harness was repaired with a deterministic base URL and passed at the accepted run above.

## Architecture direction

Use exact-object, exact-temporary-value, generation-bound mutation receipts; compare-before-restore; explicit `superseded`/`unresolved` cleanup states; topology-aware wrapper cleanup; private link-original receipts; and a retry barrier or generation-safe protocol preventing stale cleanup from overtaking a newer prepare.

Detailed evidence: `RESEARCH_FULL_RESTART_C37_FAILURE_RETRY_ROLLBACK_2026-09-03.md`.
