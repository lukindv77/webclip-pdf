# WebClip — P1-231 S0-A package authority source-spec execution receipt — 2026-09-10

Owner: `P1-231 | ACTIVE`  
Mode: **RESEARCH-ONLY / COMMITTED-SOURCE PROOF**

## Canonical baseline

Tranche started from exact canonical:

```text
main = 7a568cce46a8838c626340fc07334dfb4a45e91c
```

Fresh `main` was re-read after committed-source evidence and remained exactly the same before this receipt was written.

Canonical baseline Repository Integrity already passed:

```text
run = 34432768571
job = 102731547842
checkout = 7a568cce46a8838c626340fc07334dfb4a45e91c
92 deterministic JavaScript test files
failures = 0
Recovery archive self-test PASS
```

## Research execution identity

Temporary research workflow:

```text
.github/workflows/p1-231-s0a-package-authority-research.yml
```

Exact committed-source execution:

```text
run = 34433231032
attempt = 1
job = 102732929936
execution SHA = 5eaf2b464653a3039c116b8f8a0967fd1e940381
runner = ubuntu-24.04
Node = 22.23.2
conclusion = success
```

The full decoded job log was fetched and read.

Exact checkout in the log:

```text
5eaf2b464653a3039c116b8f8a0967fd1e940381
```

Syntax check passed and the committed research model produced:

```text
P1-231 S0-A package authority source-spec model: PASS;
cases=231;
package_files=33;
topology_sha256=4f3b1677b4800a8bf1b98509650d353e91559c82a421aeaf5e99558f6430e489;
head=5eaf2b464653a3039c116b8f8a0967fd1e940381
```

## What the 231-case proof covers

The model includes both synthetic fail-closed controls and exact repository-tree proof.

It verifies, among other cases:

- exact 33-file bootstrap census;
- strict three-field package-manifest semantic shape;
- duplicate JSON key rejection, including duplicate keys in nested object syntax;
- BOM, malformed/invalid UTF-8, non-standard constant, unknown/missing/wrong field rejection;
- explicit `portable-ascii-v1` path grammar;
- exact duplicate, ASCII-case collision and file/directory-prefix collision rejection;
- Windows reserved basenames;
- traversal/backslash/control/non-ASCII/trailing-dot rejection;
- `manifest.json` required exactly by canonical spelling;
- array reordering and JSON source formatting/key ordering preserve semantic topology digest;
- membership add/remove changes topology digest;
- exact execution `HEAD` resolves to a commit;
- every one of the 33 current package members exists in the exact execution Git tree as `type=blob`, `mode=100644`, with an exact Git object id;
- `public_suffix_list.dat`, future package-authority source, project docs/tools and `.github/**` remain outside package membership;
- current legacy PR checker still contains its independent suffix/directory runtime-impact heuristic and does not already own the proposed package manifest.

The printed topology SHA is a **research-model semantic topology digest**, not a production RPF and not release authority.

## Artifact fallback verification

GitHub diagnostic artifact:

```text
artifact id = 10135238288
artifact name = p1-231-s0a-package-authority-5eaf2b464653a3039c116b8f8a0967fd1e940381
artifact wrapper bytes = 361
artifact wrapper SHA-256 = 5fc569efd68895e98373279ef4d1dd1a281ce300f20ba630afee251f29a2bf04
```

The artifact ZIP was independently downloaded and its SHA-256 recomputed; it matches GitHub metadata.

It contains exactly one file:

```text
p1-231-s0a-package-authority-output.txt
bytes = 212
SHA-256 = ee056bc3ce851f67b7de7d59b9504ce8c1166e72d166c450da04b64c10c4e64e
```

The file contains exactly the same PASS/cases/package-files/topology-digest/execution-SHA result as the full raw log.

## External evidence used

External comparison evidence was used only to refine parser strictness:

- RFC 8259: interoperable JSON objects should use unique names; interoperable exchanged JSON uses UTF-8;
- Python 3.12 `json`: repeated object names are last-wins by default and `NaN`/`Infinity` extensions are accepted unless caller overrides behavior.

The WebClip-specific decision is therefore deliberately stricter: duplicate keys, non-standard numeric constants, BOM and unknown fields fail closed in S0-A authority parsing.

## Scope / non-claims

This receipt proves a research source specification and deterministic model only.

It does **not** prove or activate:

```text
production release_package_manifest_v1.json
production package-authority validator
RPF engine
source-generation consistency gate
receipt settlement
release readiness migration
release-gate activation
official WebClip ZIP construction
real Chrome qualification
real Yandex qualification
Yandex L5
tag/GitHub Release publication
```

No runtime, `manifest.json`, Registry status, release-readiness value or release policy was changed by this tranche.

The temporary research workflow is to be removed before PR so it is execution infrastructure, not durable project workflow surface.
