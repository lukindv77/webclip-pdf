# WebClip — fresh full-restart C42 Yandex upload/object/public identity — 2026-09-12

Date: 2026-09-12

Canonical source inspected: `main = 777e039017626e14aab9c879dbdf7c568285e3af`.

Coverage coordinate: **C42 — Yandex upload/object/public identity**.

Research impact: existing owners **P0-073, P0-074, P0-078, P1-184**. No new P-code is allocated. No production runtime, manifest, workflow, release-readiness or product contract change is made by this evidence.

## 1. Decision

C42 advances from the fresh-restart placeholder:

`NOT-TRIAGED / UNKNOWN`

to the terminal research classification:

**`SOURCE-REVIEWED + DETERMINISTIC-COVERED / FINDING; EXTERNAL-REQUIRED (L5)`**.

The proven current-source finding is narrow and material: WebClip can treat a remote Yandex object as the upload/recovery target using path/type/exact byte-size metadata without proving that the remote object's bytes are the exact PDF bytes owned by the admitted WebClip operation. Two different PDFs with the same byte length are therefore not distinguishable by the current reuse/recovery receipt.

This is the existing P1-184 root cause, with P0-073/P0-074 immutable account/root/config context and P0-078 publication-generation policy as required surrounding authority. The finding is research-terminal because the mechanism, controls, owners and required external next evidence are explicit. It is **not implementation-closed** and is **not an L5 PASS**.

## 2. Current source proof (L1)

Current `service-worker.js` asks Yandex resource metadata for fields including:

`name,path,type,size,public_url,resource_id`

on the existing-file reuse path and multiple recovery/locate paths.

The existing-file reuse path checks:

1. the target path;
2. `type === 'file'`;
3. exact expected byte size via `assertExactYandexRemoteByteSize(...)`;
4. then treats the file as reusable and skips byte upload.

After a new upload, WebClip again fetches resource metadata, checks `type === 'file'` and exact byte size, then retains normalized `resource_id` / `public_url` in the remote checkpoint/final result.

The current metadata field list does **not** request a server content digest. Consequently, path + file type + exact size + resource id/public URL establish locator/object metadata, but not content equality with the exact local PDF byte generation.

This does not claim that `resource_id` is unstable. It claims that the current WebClip admission rule does not bind that remote identity to the exact locally owned PDF bytes before reuse/publication after an ambiguous or recovered upload outcome.

## 3. Canonical collision control

Let two valid byte strings `A` and `B` satisfy:

- same remote path;
- same byte length;
- different SHA-256 digest.

If the remote path currently contains `B` while the WebClip operation owns `A`, the current-shaped predicate accepts the remote object when path/type/size match. That is sufficient to falsify exact-byte identity even without any claim about hash collisions: the two contents are intentionally different and merely have equal length.

This is not a hypothetical provider fault. It is an admission-logic insufficiency: byte length is not a content receipt.

## 4. Deterministic contract model (L2)

Added model:

`project_tools/test_c42_yandex_exact_object_receipt_model.js`

Local execution before PR:

- Node `v22.16.0`;
- `node --check` — PASS;
- deterministic execution — **PASS 30 checks**;
- local Git blob after owner markers — `10db6d0a5b0eea679525cd307a426194d8d80851`.

The model is deliberately a contract model, not a production implementation and not a real Yandex test.

### Positive/current-shaped control

Two synthetic PDF byte strings have equal length and different SHA-256 values. The current-shaped `path + type + size` predicate accepts the wrong same-size object.

### Candidate exact-receipt controls

A candidate receipt rejects:

- same path/same size but different SHA-256;
- missing server digest;
- missing remote `resource_id`;
- path or type mismatch;
- size mismatch;
- account mismatch;
- root mismatch;
- config-generation mismatch;
- operation-id mismatch;
- publication using a stale receipt after account/root/config/operation change.

It accepts only an exact content digest plus stable remote identity under the same immutable operation context. A public URL may be attached only to that already verified object receipt.

The model intentionally classifies missing server digest as **unknown/fail-closed**, not as permission to fall back to same-size adoption.

## 5. Current external contract recheck

Current official Yandex Disk REST documentation rechecked on 2026-09-12 states that the API can obtain resource metadata and upload files, and its live API playground sends requests to the production API. The official API entry point requires OAuth context for user resources.

Official sources:

- https://yandex.ru/dev/disk-api/doc/ru/
- https://yandex.ru/dev/disk/rest/
- https://yandex.ru/legal/disk_api/ru/

A current third-party Yandex Disk client/schema reference and a sanitized 2026 live integration report both expose/observe resource SHA-256 metadata in addition to size/identity. These are useful corroboration for a remediation direction, but are **not** promoted to provider-authoritative WebClip acceptance evidence:

- https://yadisk.readthedocs.io/
- https://github.com/bizyumov/yandex-office/issues/44

The sanitized live report is especially relevant because it independently describes a real Yandex Disk flow that verifies final metadata size/hash and then download-hashes the remote object. WebClip must still obtain its own authorized L5 evidence before relying on that behavior for closure.

## 6. Remediation direction, not implementation authority

The strongest currently supported implementation direction is:

1. own an immutable local PDF byte generation and SHA-256 before remote transfer;
2. bind the remote operation to immutable account UID, root path, config/publication generation and operation id;
3. after upload/recovery/ambiguous outcome, obtain a stable remote object identity and a server-observed content digest when the provider returns one;
4. require exact digest + expected size + immutable context before adopting an existing object as this operation's PDF;
5. if provider metadata does not expose a trustworthy digest for the relevant real endpoint/account, remain fail-closed or perform an explicit download-and-hash verification before adoption/publication;
6. bind any publication/public URL receipt to the already verified exact object identity and operation generation;
7. persist enough receipt material for B8 Journal/provenance reconciliation without persisting OAuth/signed-transfer secrets.

This direction is not accepted as production architecture solely from this document. Real API behavior, latency/cost, privacy, fields availability, and ambiguous-outcome semantics require authorized L5 validation.

## 7. Exact L5 exit protocol

C42's external boundary is now explicit rather than generically "unknown".

Required opt-in environment owned by an authorized operator:

- dedicated Yandex test account or explicitly authorized account;
- dedicated isolated WebClip test root;
- OAuth scope/token authorized for that test;
- unique operation id and unique remote path per run;
- no production/user documents reused as fixtures.

Minimum real-product matrix:

1. **clean upload positive control** — upload unique PDF `A`; verify exact local digest, final remote path, stable remote object identity, returned metadata digest if available, and optional download-back digest;
2. **same-path/same-size negative control** — pre-place different PDF `B` with equal size; recovery/reuse must not adopt it as `A`;
3. **ambiguous transfer outcome** — force/observe response loss or timeout after transfer may have reached the provider; reconciliation must settle to exact `A`, explicit absent, or bounded unknown, never size-only reuse;
4. **account/root generation boundary** — unresolved operation from context A must not settle through context B;
5. **publication boundary** — public link creation must be authorized only from the exact verified object receipt for the admitted publication generation;
6. **revocation/policy control** — disabling publication after an already-started unknown publish must not be represented as cancellation without settlement evidence;
7. **Journal receipt** — final durable record must bind to the exact PDF digest and exact verified remote object/publication receipt;
8. **cleanup** — remove isolated proof objects/public links and retain only sanitized evidence identifiers/hashes.

If the provider does not expose a usable digest in real metadata, the L5 protocol must record that fact and use a download-and-hash proof (or retain `EXTERNAL-REQUIRED / UNKNOWN`); it must not infer exact content from size.

## 8. Controls and boundary classification

- positive control: exact bytes + exact context + exact remote identity;
- negative control: equal-size different bytes;
- contract-boundary control: stable path/resource id without content digest is not exact-byte identity;
- generation control: account/root/config/operation mismatch cannot reuse a receipt;
- failure/degradation control: missing digest or unsettled provider outcome stays explicit unknown/fail-closed;
- privacy control: OAuth tokens, signed upload URLs and bearer-like public control material must not enter durable research logs.

Relevant pipeline boundaries: **B2, B6, B7, B8, B9**. Required real boundary for closure: **L5**.

## 9. Owner reconciliation

No new owner is warranted.

- **P1-184 ACTIVE** — direct exact object/content creation receipt owner; current path+size adoption is the primary finding.
- **P0-073 ACTIVE** — unresolved remote completion/recovery must remain immutable account/root scoped.
- **P0-074 ACTIVE** — long Yandex operation must retain one immutable auth/account/root/config/publication context/generation.
- **P0-078 ACTIVE** — publication authority/revocation is generation-scoped and cannot rewrite an already-started unknown outcome as cancelled.

Related owners such as P0-070/P0-079 remain supporting where exact PDF generation/cache identity is upstream, but this tranche does not broaden their acceptance or allocate a new root.

## 10. C42 final research state

C42 is no longer an unexplained `NOT-TRIAGED / UNKNOWN` cell.

**Current research state:** `SOURCE-REVIEWED + DETERMINISTIC-COVERED / FINDING; EXTERNAL-REQUIRED (L5)`.

**Implementation state:** existing owners remain ACTIVE.

**Release interpretation:** no Yandex E2E PASS is claimed; `RELEASE_READINESS.md` remains `NOT READY`.
