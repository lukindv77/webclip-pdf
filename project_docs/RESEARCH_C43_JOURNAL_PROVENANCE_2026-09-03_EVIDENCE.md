# WebClip — C43 Journal / provenance / exact artifact linkage — evidence — 2026-09-03

Canonical source baseline: `ddb56d6b7c7ceabb3dcfefcfc80d0d288e9efb28`  
Accepted workflow head: `f727a96e77a748fce23dfa9ad97485cc6bf20c75`  
Workflow run: `33720292239`  
Job: `100537851083`  
Google Chrome: `151.0.7922.173`  
Result SHA-256: `ed8ae54695d688d644407e4549c3a525de36be313039285744231a4b7d940149`  
Harness: `project_tools/research_c43_journal_provenance.py`

## Accepted result

**C43 local tranche: L4 partial finding + positive controls. Remote Yandex exact-object/public-link linkage remains OPEN at L5.**

The first run `33720212281` is diagnostic only: physical generation succeeded, but three source assertions searched too narrow a source window. The harness was corrected without changing production source. Only run `33720292239` is accepted.

## Physical artifacts

Both documents used the same ephemeral `/same-url` locator and the current WebClip physical PDF preparation path.

| Artifact | Bytes | SHA-256 | Marker |
|---|---:|---|---|
| A | 24,270 | `6ebc998486a22afdc620a87d2d8fcf4f2d29b06f87a27d2848cfb9ee662e58f6` | A only |
| B | 24,581 | `91b6127452b44c40e6508c55b948e2b81d9f0dbbea08014b713c9e367770a677` | B only |

The distinct hashes and mutually exclusive markers establish two different physical PDF generations at one locator.

## Exact-source checks

All accepted source guards passed:

- pending-Journal normalization exists;
- pending data carries `operationId`, `journalEntryId` and `journalCreatedAt`;
- pending normalization has no `pdfSha256`, `pdfDigest` or `artifactSha256` field;
- `appendJournalEntry()` supports a required durable checkpoint;
- durable checkpoint is re-read on the append write path and missing durable state sets `durableCheckpointMissing`;
- pending checkpoint is also re-read before append;
- successful append touches the Journal DB revision;
- PDF-cache metadata carries `pdfByteLength` but no PDF digest.

## Finding — artifact identity is not cryptographically bound to Journal provenance

Current source can preserve operation identity, URL/metadata, Journal entry identity and byte length without carrying a cryptographic identity of the physical PDF through the pending/final Journal provenance record. Therefore those fields do not themselves prove which exact PDF byte generation reached finalization.

This does not require claiming that two PDFs have the same length. The finding is narrower: the current receipt has no statement equivalent to “these final bytes hash to X”. A causal control adds `pdfSha256` to the admitted artifact receipt and rejects physical generation B when operation A expects A's digest.

The direct root-cause owner remains **P0-070 ACTIVE**: exact full-document generation must survive through finalization. No new owner is allocated.

## Positive control — stale finalization does not resurrect removed checkpoint state

Current `appendJournalEntry()` rechecks the required durable checkpoint and pending checkpoint on the final write path. If a concurrent clear/import/replacement removed the durable source checkpoint, the source sets `durableCheckpointMissing` and does not append stale in-memory metadata. The accepted deterministic model reproduces that fail-closed branch.

This is positive evidence for **P0-076 ACTIVE**'s Journal-generation/CAS direction; it does not close P0-076 globally.

## Owner reconciliation

- **P0-070 ACTIVE** — direct owner for the exact artifact-generation/provenance gap.
- **P0-076 ACTIVE** — positive stale-finalization/CAS control.
- **P1-206 ACTIVE** — supporting/source only; its direct owner contract is coherent Journal composed-view revision.
- **P1-190 ACTIVE** — supporting/source only; its direct owner contract is imported historical `operationId` not linking to live OperationLog.
- **P1-216 ACTIVE** — supporting/source only; its direct owner contract is one derived URL identity domain for legacy/modern Journal rows.

No new P-code, Registry wording/status, runtime, manifest, build, tag or release change is warranted.

## External boundary not claimed

No real Yandex upload/object/public-link receipt was produced. C42 and the remote half of C43 require an explicitly authorized test account/root. That prerequisite is unavailable in the current CI/repository evidence context, so the remote chain remains an explicit L5 blocker rather than simulated success.

## Evidence classification

`L4-REVALIDATED / PARTIAL/FINDING + POSITIVE/PHYSICAL-PDF/LOCAL-CHECKPOINT/ATOMIC-STALE-FINALIZATION/DIGEST-BOUND CONTROL; REMOTE-L5 OPEN (P0-070; P0-076 positive, P1-206/P1-190/P1-216 supporting/source)`

Release state remains **NOT READY** and manifest version remains `0.9.8`.
