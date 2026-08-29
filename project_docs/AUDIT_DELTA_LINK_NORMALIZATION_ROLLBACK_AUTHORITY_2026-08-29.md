# Audit delta — live link normalization rollback needs CAS and private receipt — 2026-08-29

Baseline `main` before this write: `48ced7fe74d1b15ed7104247621bd98ec65d6b4d`.

Docs-only audit checkpoint. Runtime, tests, manifest, build, tag and Release are unchanged.

## Classification

**New P1-221 — PDF link normalization rollback trusts host-mutable rollback metadata and can overwrite a newer page-owned `href`.**

P0-071 owns safe URI semantics/TOCTOU in the actual printed representation. P1-221 is the separate post-preparation mutation-authority problem: restoring the live page after print.

## Source proof

Before print, `content.js` normalizes selected links by writing the original `href` into a DOM attribute and replacing `href` with the resolved absolute URL:

```js
const original = link.getAttribute('href');
link.setAttribute(ABS_HREF_ATTR, original);
link.setAttribute('href', link.href);
state.changedLinks.push(link);
```

At cleanup it does:

```js
const original = link.getAttribute(ABS_HREF_ATTR);
if (original != null) link.setAttribute('href', original);
link.removeAttribute(ABS_HREF_ATTR);
```

Two ownership facts are missing:

1. cleanup does not verify that current `href` still equals the exact temporary normalized value WebClip wrote;
2. the rollback source itself (`data-webclip-original-href`) is stored in page-visible/page-mutable DOM and is reread later instead of using an immutable WebClip-side receipt.

## Deterministic stale-write schedule

1. Link starts `href="item/1"`.
2. WebClip stores `item/1` in its marker and writes an absolute temporary href.
3. SPA/router updates the same live link to `href="item/2"` before cleanup.
4. WebClip cleanup rereads its marker and writes `href="item/1"`.
5. The newer application state is silently reverted.

A hostile or merely reactive page can also alter/remove the rollback marker. The page already owns its own links, so this is not a privilege escalation by itself; the correctness defect is that WebClip treats host-mutable state as an authoritative rollback receipt and performs a stale write after its temporary ownership was superseded.

## Required contract

Temporary link normalization must keep a WebClip-owned record containing at least:

- exact link object + accepted document/application/preparation generation;
- original `{present,value}`;
- exact temporary `{present,value}` written for print.

Cleanup must compare the current live value to the exact temporary value and restore only on equality. If the host changed `href`, cleanup leaves it unchanged and records bounded `rollback-superseded` diagnostics.

The original value used for rollback must not be obtained from a host-mutable data attribute. If a DOM marker is still needed for CSS/diagnostics, it is non-authoritative and cleanup must remove only the exact marker/value owned by the current generation.

The preferred P0-075 end state is to normalize URLs only in an inert/frozen printable representation, eliminating live-page href rollback altogether.

## Required regressions

1. `href` remains exactly WebClip temporary absolute value -> restore exact original relative href.
2. SPA changes `href` before cleanup -> newer href survives.
3. Page removes `href` before cleanup -> WebClip does not resurrect old href unless current state exactly matches its temporary receipt semantics.
4. Page changes/removes `ABS_HREF_ATTR` -> rollback authority is unaffected because the authoritative receipt is private WebClip state.
5. Old preparation cleanup cannot revert a link normalized by a newer preparation generation.
6. Detached/replaced link node does not cause mutation of a replacement node with similar selector/id.
7. P0-071 safe printable-link behavior remains intact.

## Duplicate check / numbering

Existing P0-071/P0-075 material covers URI safety and the broader frozen-print boundary, and the 2026-08-27 print-preparation audit notes that link normalization mutates live DOM. Repository semantic search found no owner for the distinct cleanup rule: host-mutable rollback metadata + compare-before-restore of `href`.

Current repository search found no `P1-221`; P1-220 is the latest newly assigned owner on current `main`. Therefore this checkpoint assigns **P1-221**.

## Validation state

Documentation only. Historical 88/88 JavaScript syntax and 74/74 deterministic tests remain historical evidence and were not rerun for this HEAD.