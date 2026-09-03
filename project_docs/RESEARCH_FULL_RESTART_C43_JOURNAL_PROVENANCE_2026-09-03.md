# WebClip — fresh full-project research — C43 Journal / provenance / exact artifact linkage — 2026-09-03

Date: 2026-09-03  
Canonical source baseline: `ddb56d6b7c7ceabb3dcfefcfc80d0d288e9efb28`  
Scope: fresh-restart coordinate **C43 — Journal / provenance / exact artifact linkage**.

## Result

**C43: `L4-REVALIDATED / PARTIAL/FINDING + POSITIVE/PHYSICAL-PDF/LOCAL-CHECKPOINT/ATOMIC-STALE-FINALIZATION/DIGEST-BOUND CONTROL; REMOTE-L5 OPEN (P0-070; P0-076 positive, P1-206/P1-190/P1-216 supporting/source)`.**

Fresh physical evidence proves that distinct PDF byte generations can occupy the same source locator. Fresh current-source inspection proves that the pending/final Journal provenance path preserves operation/Journal identity and validates durable checkpoint existence, but does not carry a cryptographic digest of the physical PDF through that provenance receipt. A digest-bound causal control distinguishes and rejects substitution of the other physical generation.

At the same time, current `appendJournalEntry()` provides a strong positive stale-finalization control: required durable and pending checkpoints are re-read on the final write path, removed durable state prevents stale append, and successful append touches Journal revision state.

The remote Yandex object/public-link half is not exercised and remains L5-open because no explicitly authorized test account/root is available to this research context.

## Accepted exact-source execution

- Chrome `151.0.7922.173`;
- workflow run `33720292239`;
- job `100537851083`;
- exact accepted workflow head `f727a96e77a748fce23dfa9ad97485cc6bf20c75`;
- conclusion **SUCCESS**;
- temporary raw-result receipt commit `a4d6978`;
- result SHA-256 `ed8ae54695d688d644407e4549c3a525de36be313039285744231a4b7d940149`;
- durable harness `project_tools/research_c43_journal_provenance.py`.

The failed earlier run is diagnostic only and is not accepted evidence.

## Physical generation evidence

Physical PDF A: 24,270 bytes, SHA-256 `6ebc998486a22afdc620a87d2d8fcf4f2d29b06f87a27d2848cfb9ee662e58f6`.  
Physical PDF B: 24,581 bytes, SHA-256 `91b6127452b44c40e6508c55b948e2b81d9f0dbbea08014b713c9e367770a677`.

Both came from the same ephemeral URL, but each contains only its own A/B marker. The exact byte identity is therefore independently observable and not reducible to the locator.

## Local provenance finding

The current pending-Journal normalization carries fields needed to identify the operation and target Journal row, including operation and Journal entry identity. Current PDF-cache metadata also carries byte length. Neither source surface carries a PDF SHA-256/artifact digest.

This means operation identity, URL and size-like metadata are useful provenance but are not a cryptographic receipt for exact physical artifact bytes. The result is particularly important when read together with C40: current mutable cache identity already permits a later physical PDF generation to replace the bytes behind a logical lookup. A final provenance chain therefore needs an immutable artifact identity, not merely operation/locator metadata.

The required repair direction is one versioned artifact receipt containing at least operation generation, admitted document generation and exact PDF digest, carried from renderer/cache through local/remote checkpoint and final Journal provenance.

## Positive stale-finalization control

Current append logic rechecks the required durable checkpoint during final Journal write. If a concurrent clear/import intentionally removed that checkpoint, the stale finalizer is rejected rather than resurrecting stale in-memory metadata. The pending checkpoint is also re-read, and the successful append path updates Journal revision state.

This is good architecture and must be retained. It is evidence in the direction of P0-076, not evidence that every P0-076 race is closed.

## Root-cause reconciliation

The artifact-byte provenance gap is not a new problem family. It is an end-to-end manifestation of **P0-070 ACTIVE**, whose owner contract requires exact full-document generation from admission through Journal finalization.

P0-076 is a positive control for stale-finalization/CAS behavior. P1-206, P1-190 and P1-216 remain supporting/source because their direct contracts concern, respectively, coherent Journal view revision, imported operationId provenance, and Journal URL identity. None is rewritten or reopened by C43.

## B1–B9 mapping

| Boundary | Fresh C43 result |
|---|---|
| B1 User Intent | One save intent cannot authorize a different physical PDF generation. |
| B2 Admission / exact generation | Same locator is insufficient; the final artifact needs admitted-generation identity. |
| B3 Capture | Not the primary new boundary in C43. |
| B4 Static Materialization | Not the primary new boundary in C43. |
| B5 Renderer | Physical A/B PDFs are distinguishable. |
| B6 Physical Artifact | Exact SHA-256 distinguishes the byte generations. |
| B7 Persistence / Transfer | Current local provenance/checkpoint metadata lacks exact PDF digest; remote chain remains untested. |
| B8 Journal / Provenance | Durable checkpoint recheck is positive; exact artifact digest binding is missing. |
| B9 Later Reading / Recovery | A readable recovered PDF can still be the wrong generation if provenance does not identify exact bytes. |

## Remaining exit evidence

C43 remains open only for the external remote half. With an explicitly authorized Yandex test account/root:

1. carry one immutable PDF digest through cache and remote checkpoint;
2. upload that exact byte generation and record exact remote object identity;
3. exercise unknown/retry/recovery without changing account/root/config/artifact generation;
4. publish/reconcile the public link against the same exact object;
5. finalize Journal while injecting a revision change and prove final provenance still refers to the same operation generation, object and PDF digest.

This work shares the external prerequisite of C42. Until it exists, C44 is the next locally executable coordinate.

## Delivery boundary

Research evidence/tooling only. Runtime and `project_docs/RESEARCH_REGISTRY.md` are unchanged. Manifest version remains `0.9.8`; release remains **NOT READY**.
