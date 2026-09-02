# GitHub repository state

Status: **CANONICAL CURRENT REPOSITORY POLICY**

`lukindv77/webclip-pdf` / `main` is the canonical working repository and the only source of truth for the current WebClip PDF tree.

Этот файл описывает только действующую repository model. Он не хранит долговечный snapshot списка branches/PR/Issues и не является историей cleanup. Remote inventory всегда проверяется fresh через GitHub.

## Current baseline

- current source/WIP: fresh `main` exact SHA;
- current requirements/technical conditions: `project_docs/USER_REQUIREMENTS.md`;
- current rationale: `project_docs/DECISIONS_AND_RATIONALE.md`;
- current P-code owner/status: `project_docs/RESEARCH_REGISTRY.md`;
- current test truth: `project_docs/TEST_STATUS.md` + exact applicable execution evidence;
- current release truth: `project_docs/RELEASE_READINESS.md`.

Historical requirement revisions, old chats, dated handoffs, generated archives and functional changelog do not compete with current baseline. Git history is used on demand for provenance, regression analysis and duplicate/root-cause reconciliation.

## Freshness requirements

Before every substantive analysis/write session:

1. fresh-fetch `main` and record exact HEAD SHA;
2. inspect open PRs, open Issues and current branches as possible unfinished durable work;
3. read the current `project_docs/CONTEXT_MANIFEST.json` bootstrap/profile;
4. do not assume remote state is unchanged from a previous chat/checkpoint.

Before write/integration/merge, repeat the applicable staleness/TOCTOU checks. After merge, confirm exact new `main` and required post-merge Repository Integrity before starting unrelated work.

Accepted project changes must be integrated into GitHub current documents; chat-only decisions are not durable project state.

## Runtime/release posture

- Manifest V3;
- runtime version `0.9.8`;
- Chrome minimum `118`;
- `0.9.9` is WIP, not a released version;
- build/tag/GitHub Release require separate explicit release decision and applicable gates;
- deterministic/CI evidence does not replace real unpacked Chrome/Yandex evidence when a claim or release gate requires it.

See `project_docs/RELEASE_READINESS.md`, `project_docs/BUILD_AND_RECOVERY_RULES.md` and `project_docs/RELEASE_HISTORY_INDEX.md`.

## PR-first workflow

Normal development, research, docs and maintenance changes follow:

`fresh main -> work branch -> bounded change -> PR -> exact-head Repository Integrity -> fresh TOCTOU -> expected-head squash merge -> exact new main -> post-merge Repository Integrity`.

`main` intentionally remains `protected=false`; the repository remains private. This is an accepted administrative posture and does not authorize direct normal writes to `main`.

Normal integration is squash-only; force-updating `main` is not part of normal work.

Detailed lifecycle: `project_docs/GITHUB_WORKFLOW.md` and `project_docs/RESEARCH_CHANGE_WORKFLOW.md`.

## Local-first execution / GitHub Actions budget

Checks that can be truthfully executed by available local/built-in tools are performed there before GitHub Actions.

GitHub Actions are used only for:

- environment/physical/external evidence unavailable locally; or
- mandatory independent delivery/release gates.

They are not the default interactive debugger. Runner minimization cannot weaken exact-head/post-merge integrity, TOCTOU, physical Chrome/external evidence or another required evidence layer.

## Comprehensive Project Research

The permanent project-wide activity is **«Комплексное исследование, оценка и проработка проекта и его архитектуры»**, defined by `project_docs/COMPREHENSIVE_PROJECT_RESEARCH_POLICY.md`.

Every substantive research question combines fresh WebClip inspection with multi-source external research: analogous/adjacent vendor products, public GitHub/GitLab implementations, relevant issues/discussions, standards/platform materials and user/community experience. External approaches are hypotheses/comparison inputs, not automatic requirements.

Research is split across as many interruption-safe instrumental sessions as required. Completeness, accuracy and evidence quality take priority over minimizing session count.

Security work is defensive security / defensive architectural analysis only.

## P-code authority and lifecycle

`project_docs/RESEARCH_REGISTRY.md` is the **single canonical current P-code owner/status registry**.

Stable P-codes are never reused. Before creating a new code, perform semantic duplicate/root-cause reconciliation using the Registry, relevant family evidence, `RESEARCH_HISTORY_INDEX.md` and Git history.

Historical PASS/FINDING does not advance current status without the fresh evidence required by current policy.

New/refined findings follow `project_docs/RESEARCH_CHANGE_WORKFLOW.md`.

## Evidence model

Use evidence by role:

- `project_docs/RESEARCH_REGISTRY.md` — current owner/status;
- `project_docs/RESEARCH_DELTA_INDEX.md` — navigation;
- `project_docs/RESEARCH_FAMILY_*_EVIDENCE.md` — durable family proof;
- `project_docs/RESEARCH_HISTORY_INDEX.md` — corrections/dedup/history;
- `project_docs/RESEARCH_CROSSCUTTING_REVALIDATION_EVIDENCE.md` — cross-cutting proof;
- `project_docs/TEST_STATUS.md` — current test narrative;
- `project_docs/TEST_EVIDENCE.md` — test/browser evidence history.

Historical evidence is proof/provenance, not current requirements authority.

## Repository hygiene

Current-tree hygiene is governed by `project_docs/GITHUB_WORKFLOW.md` and checked by `project_tools/check_repository_hygiene.py`.

Key invariants include:

- open project PRs are real merge candidates, not archives;
- temporary research deltas/staged evidence remain bounded;
- final mergeable tree contains only approved permanent workflows unless policy is explicitly changed;
- generated archives/secrets/caches are not tracked;
- completed working branches are disposable unless a current explicit evidence-retention reason exists;
- actual branch/PR/Issue inventory is checked remotely at session start rather than hardcoded here.

## Repository integrity automation

`.github/workflows/repository-integrity.yml` is a read-only independent delivery verification layer. It runs repository consistency/hygiene, CI-pin/workflow policy checks, PR change-contract checks, release-readiness structure, JavaScript syntax/deterministic tests and recovery provenance checks defined by the current workflow tree.

The exact current workflow/action pins are authoritative in workflow files, not duplicated here.

`NOT READY` is a valid ordinary release state; malformed/missing readiness structure is not.

## Release gate

`.github/workflows/release-gate.yml` is a separate manual read-only fail-closed gate for an exact candidate SHA/version. It does not itself build, tag, publish or mutate GitHub Releases.

Release publication requires separate explicit user decision after applicable gates.

## Recovery

- exact Git commit SHA is canonical WIP source identity;
- annotated release tag points to exact tested/released commit;
- user-facing extension ZIP is derived and does not require nested full source/recovery ZIP;
- optional recovery ZIP is an offline/disaster artifact from a clean exact commit with source metadata/hashes;
- `project_docs/RESTORE_PROMPT.md` is the restart procedure.
