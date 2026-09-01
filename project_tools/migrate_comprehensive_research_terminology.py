#!/usr/bin/env python3
from __future__ import annotations

import json
import pathlib
import re
import subprocess

ROOT = pathlib.Path(__file__).resolve().parents[1]
SELF = pathlib.Path(__file__).relative_to(ROOT).as_posix()
TEMP_WORKFLOW = ".github/workflows/research-terminology-migration-temp.yml"

EN_UPPER = "AUDIT"
EN_TITLE = "Audit"
EN_LOWER = "audit"

RU_REPLACEMENTS = [
    ("АУДИТОРСКИХ", "ИССЛЕДОВАТЕЛЬСКИХ"),
    ("АУДИТОРСКИЙ", "ИССЛЕДОВАТЕЛЬСКИЙ"),
    ("АУДИТОРСКАЯ", "ИССЛЕДОВАТЕЛЬСКАЯ"),
    ("АУДИТОРСКОЕ", "ИССЛЕДОВАТЕЛЬСКОЕ"),
    ("АУДИТОРАМИ", "ИССЛЕДОВАТЕЛЯМИ"),
    ("АУДИТОРОВ", "ИССЛЕДОВАТЕЛЕЙ"),
    ("АУДИТОР", "ИССЛЕДОВАТЕЛЬ"),
    ("АУДИТАМИ", "ИССЛЕДОВАНИЯМИ"),
    ("АУДИТОМ", "ИССЛЕДОВАНИЕМ"),
    ("АУДИТАХ", "ИССЛЕДОВАНИЯХ"),
    ("АУДИТОВ", "ИССЛЕДОВАНИЙ"),
    ("АУДИТУ", "ИССЛЕДОВАНИЮ"),
    ("АУДИТЕ", "ИССЛЕДОВАНИИ"),
    ("АУДИТА", "ИССЛЕДОВАНИЯ"),
    ("АУДИТЫ", "ИССЛЕДОВАНИЯ"),
    ("АУДИТ", "ИССЛЕДОВАНИЕ"),
    ("Аудиторских", "Исследовательских"),
    ("Аудиторский", "Исследовательский"),
    ("Аудиторская", "Исследовательская"),
    ("Аудиторское", "Исследовательское"),
    ("Аудиторами", "Исследователями"),
    ("Аудиторов", "Исследователей"),
    ("Аудитор", "Исследователь"),
    ("Аудитами", "Исследованиями"),
    ("Аудитом", "Исследованием"),
    ("Аудитах", "Исследованиях"),
    ("Аудитов", "Исследований"),
    ("Аудиту", "Исследованию"),
    ("Аудите", "Исследовании"),
    ("Аудита", "Исследования"),
    ("Аудиты", "Исследования"),
    ("Аудит", "Исследование"),
    ("аудиторских", "исследовательских"),
    ("аудиторский", "исследовательский"),
    ("аудиторская", "исследовательская"),
    ("аудиторское", "исследовательское"),
    ("аудиторами", "исследователями"),
    ("аудиторов", "исследователей"),
    ("аудитор", "исследователь"),
    ("аудитами", "исследованиями"),
    ("аудитом", "исследованием"),
    ("аудитах", "исследованиях"),
    ("аудитов", "исследований"),
    ("аудиту", "исследованию"),
    ("аудите", "исследовании"),
    ("аудита", "исследования"),
    ("аудиты", "исследования"),
    ("аудит", "исследование"),
]

POLICY = '''# Comprehensive Project Research, Assessment and Architecture Development Policy

Status: **CANONICAL / PERMANENT**

## Canonical concept

The canonical Russian name of the project-wide engineering activity is:

**«Комплексное исследование, оценка и проработка проекта и его архитектуры»**.

Allowed concise forms are:

- «Комплексное исследование проекта»;
- «Глубокое комплексное исследование проекта»;
- «Полное комплексное исследование проекта».

In repository paths, machine-readable fields, CI identifiers and English operational prose, the word **Research** denotes this full canonical concept unless a narrower meaning is explicitly stated.

## Objective

The activity is not limited to defect discovery or compliance checking. Its objective is to understand the project as an engineered system, evaluate whether its architecture and implementation serve the product mission, identify weaknesses and opportunities, and develop concrete architecture and implementation improvements with reproducible evidence.

## Mandatory non-exhaustive scope

Every full or deep comprehensive project research campaign MUST consider, where material to the project:

1. requirements and technical conditions;
2. project architecture;
3. implemented technical solutions;
4. implementation conformity with requirements and product contracts;
5. relevant industry standards and formats;
6. architectural weak points and boundary failures;
7. technical debt;
8. redundant, duplicated or inefficient solutions;
9. performance and scalability;
10. reliability, resilience and failure recovery;
11. security as defensive security / defensive architectural analysis;
12. maintainability;
13. source-code structure and code quality;
14. dependencies and external integrations;
15. discovered problems, limitations and risks;
16. improvement alternatives and trade-offs;
17. recommended architecture changes;
18. comparable solutions from other authors and vendors;
19. user wishes, complaints and expectations around comparable products;
20. usage trends in comparable products;
21. user stories and real-world usage patterns associated with comparable products;
22. adjacent mechanisms discovered during research when they can materially affect correctness, fidelity, safety, reliability, maintainability or future architecture.

The list is a minimum, not a maximum.

## Evidence and reasoning model

Research conclusions MUST distinguish:

- canonical project requirements and contracts;
- current source and architecture inspection;
- deterministic test evidence;
- physical/browser/external evidence;
- external industry/vendor/community research;
- inference and architecture recommendations.

Historical results may accelerate discovery and duplicate reconciliation, but current campaign advancement requires fresh evidence appropriate to the claim. Existing P-code ownership remains the root-cause/status authority unless canonical project policy explicitly changes it.

## Comparative and user-context research

Where an architecture or product decision would benefit from outside context, the research MUST actively examine comparable products, vendor approaches, standards, user feedback, usage trends and user stories. External observations are evidence inputs, not automatic requirements: recommendations must explain applicability, trade-offs and fit with the WebClip product mission.

## Defensive security boundary

Security work under this policy is defensive: threat modeling, trust-boundary review, permission minimization, confidentiality/integrity/availability analysis, abuse resistance, failure containment, recovery, privacy and secure architecture. It does not authorize offensive exploitation outside controlled validation needed to protect this project and its users.

## Architecture-development requirement

A finding is not the end state of comprehensive research. Material findings SHOULD be followed by one or more of:

- root-cause model;
- architectural alternatives;
- recommended target state;
- migration or remediation sequence;
- regression/evidence strategy;
- explicit residual risk or accepted limitation.

## Repository terminology contract

Current mutable repository documents, templates, project tools, workflow definitions, active branch names and current GitHub work items MUST use the Research terminology defined here. Immutable historical Git objects and externally stored execution history remain unchanged for provenance, but current documents SHOULD reference them by stable commit/blob/run identifiers rather than reproducing deprecated historical wording.

Repository Integrity enforces this terminology contract on the current tracked tree.
'''

CHECKER = r'''#!/usr/bin/env python3
from __future__ import annotations

import pathlib
import subprocess

ROOT = pathlib.Path(__file__).resolve().parents[1]
EN = "au" + "dit"
RU = "".join(chr(x) for x in (0x430, 0x443, 0x434, 0x438, 0x442))
SKIP = {"project_tools/migrate_comprehensive_research_terminology.py"}


def tracked_paths(root: pathlib.Path) -> list[pathlib.Path]:
    raw = subprocess.check_output(["git", "ls-files", "-z"], cwd=root)
    return [root / p.decode("utf-8") for p in raw.split(b"\0") if p]


def findings(root: pathlib.Path = ROOT) -> list[str]:
    out: list[str] = []
    for path in tracked_paths(root):
        rel = path.relative_to(root).as_posix()
        if rel in SKIP:
            continue
        folded_path = rel.casefold()
        if EN in folded_path or RU in folded_path:
            out.append(f"path:{rel}")
        try:
            text = path.read_text(encoding="utf-8")
        except (UnicodeDecodeError, IsADirectoryError):
            continue
        folded = text.casefold()
        if EN in folded or RU in folded:
            out.append(f"text:{rel}")
    return out


def main() -> int:
    bad = findings()
    if bad:
        for item in bad:
            print(item)
        raise SystemExit(f"Research terminology contract failed: findings={len(bad)}")
    print("Research terminology contract PASS")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
'''

SELF_TEST = r'''#!/usr/bin/env python3
from __future__ import annotations

import pathlib
import tempfile

EN = "au" + "dit"
RU = "".join(chr(x) for x in (0x430, 0x443, 0x434, 0x438, 0x442))


def contains_forbidden(value: str) -> bool:
    folded = value.casefold()
    return EN in folded or RU in folded


def main() -> int:
    assert not contains_forbidden("Comprehensive Project Research")
    assert contains_forbidden("legacy-" + EN + "-token")
    assert contains_forbidden("legacy-" + RU + "-token")
    with tempfile.TemporaryDirectory() as tmp:
        p = pathlib.Path(tmp) / "research.txt"
        p.write_text("Research terminology is canonical.", encoding="utf-8")
        assert not contains_forbidden(p.read_text(encoding="utf-8"))
    print("Research terminology checker self-test PASS")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
'''

FINAL_DELTA_TEST = r'''#!/usr/bin/env python3
"""Verify historical final-delta provenance without reproducing retired wording."""
from __future__ import annotations

import pathlib
import subprocess

ROOT = pathlib.Path(__file__).resolve().parents[1]
EXPECTED_BLOB = "438bf6a4b2e3318d0efcfb97ef778da30f2f0faa"
RETIRED_PATH = ROOT / "project_docs" / "RESEARCH_RETIRED_DELTA_EVIDENCE.md"


def main() -> int:
    subprocess.run(["git", "cat-file", "-e", f"{EXPECTED_BLOB}^{{blob}}"], cwd=ROOT, check=True)
    assert RETIRED_PATH.is_file(), RETIRED_PATH
    text = RETIRED_PATH.read_text(encoding="utf-8")
    assert EXPECTED_BLOB in text, "historical source blob identity missing from retired evidence"
    print(f"Final research delta retirement provenance PASS: blob={EXPECTED_BLOB}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
'''

STAGED_TEST = r'''#!/usr/bin/env python3
"""Deterministic hash-addressed provenance checks for staged research-evidence compaction."""
from __future__ import annotations

import pathlib
import subprocess

ROOT = pathlib.Path(__file__).resolve().parents[1]

SERIES = (
    {
        "name": "replaced-resource",
        "consolidated": "project_docs/RESEARCH_REPLACED_RESOURCE_CONVERGENCE_FINAL_2026-08-30_EVIDENCE.md",
        "blobs": ("b36dc030b245ef39d150d5e8de561859f28ebc19", "aa7b484a30c7591ac2e15e0f0269ca6d229f09fa", "a06dca0fb4752fc4c6514f4069ea97e63cb91452"),
        "retired": ("project_docs/RESEARCH_REPLACED_RESOURCE_CONVERGENCE_2026-08-30_EVIDENCE.md", "project_docs/RESEARCH_REPLACED_RESOURCE_CONVERGENCE_STAGE2_2026-08-30_EVIDENCE.md"),
        "blocks": 56,
    },
    {
        "name": "css-visual-dependency",
        "consolidated": "project_docs/RESEARCH_CSS_VISUAL_DEPENDENCY_GRAPH_FINAL_2026-08-30_EVIDENCE.md",
        "blobs": ("9ab49df3b368a68bfac8ade402453f85b0df9a20", "bc772620ab18d202406adf0a81d69483000ba992", "88f25125e66412d50434af2a425157f5c5dfb581", "7bac52cee7a9b7e3eb1aff4b48faf7370784bafb"),
        "retired": ("project_docs/RESEARCH_CSS_VISUAL_DEPENDENCY_GRAPH_2026-08-30_EVIDENCE.md", "project_docs/RESEARCH_CSS_VISUAL_DEPENDENCY_GRAPH_STAGE2_2026-08-30_EVIDENCE.md", "project_docs/RESEARCH_CSS_VISUAL_DEPENDENCY_GRAPH_STAGE3_2026-08-30_EVIDENCE.md"),
        "blocks": 56,
    },
    {
        "name": "flattened-document-namespace",
        "consolidated": "project_docs/RESEARCH_FLATTENED_DOCUMENT_NAMESPACE_FINAL_2026-08-30_EVIDENCE.md",
        "blobs": ("f27442b95e2528c63c0a0e974a5a26c8c69f859c", "f083b46aa6260fd19dfc446275592890582ce960", "8ca747bfea509f3da38098cf109f04d541395d39", "ea57fb2663a9b12036ced7c9465defc5102f7466"),
        "retired": ("project_docs/RESEARCH_FLATTENED_DOCUMENT_NAMESPACE_2026-08-30_EVIDENCE.md", "project_docs/RESEARCH_FLATTENED_DOCUMENT_NAMESPACE_STAGE2_2026-08-30_EVIDENCE.md", "project_docs/RESEARCH_FLATTENED_DOCUMENT_NAMESPACE_STAGE3_2026-08-30_EVIDENCE.md"),
        "blocks": 56,
    },
    {
        "name": "composed-rendered-scope",
        "consolidated": "project_docs/RESEARCH_COMPOSED_RENDERED_SCOPE_CONVERGENCE_FINAL_2026-08-30_EVIDENCE.md",
        "blobs": ("cb97d2be0675a76da0209c8c7044043cf7efa910", "7002fafcb2899e7fa811988f09ae23726479cec4", "afcbbd355ff39af1c0d829515d03a44dea878052", "4e36a6d7c7418c2bb8c9a7de6299bfc414ef408b"),
        "retired": ("project_docs/RESEARCH_COMPOSED_RENDERED_SCOPE_CONVERGENCE_2026-08-30_EVIDENCE.md", "project_docs/RESEARCH_COMPOSED_RENDERED_SCOPE_CONVERGENCE_STAGE2_2026-08-30_EVIDENCE.md", "project_docs/RESEARCH_COMPOSED_RENDERED_SCOPE_CONVERGENCE_STAGE3_2026-08-30_EVIDENCE.md"),
        "blocks": 56,
    },
)


def require_blob(blob: str) -> None:
    subprocess.run(["git", "cat-file", "-e", f"{blob}^{{blob}}"], cwd=ROOT, check=True)


def check_series(series: dict[str, object]) -> None:
    name = str(series["name"])
    consolidated = ROOT / str(series["consolidated"])
    blobs = tuple(series["blobs"])
    retired = tuple(series["retired"])
    blocks = int(series["blocks"])
    assert consolidated.is_file(), f"{name}: missing consolidated evidence"
    text = consolidated.read_text(encoding="utf-8")
    for blob in blobs:
        require_blob(str(blob))
        assert str(blob) in text, f"{name}: consolidated evidence lost historical blob identity {blob}"
    for rel in retired:
        assert not (ROOT / str(rel)).exists(), f"{name}: retired staged checkpoint returned: {rel}"
    for block in range(1, blocks + 1):
        assert f"{block}. " in text, f"{name}: missing block-preservation marker {block}"


def main() -> int:
    for series in SERIES:
        check_series(series)
    print(f"Staged research evidence compaction provenance PASS: series={len(SERIES)}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
'''


def run(*args: str) -> str:
    return subprocess.check_output(args, cwd=ROOT, text=True).strip()


def tracked() -> list[str]:
    raw = subprocess.check_output(["git", "ls-files", "-z"], cwd=ROOT)
    return [p.decode("utf-8") for p in raw.split(b"\0") if p]


def renamed(path: str) -> str:
    return path.replace(EN_UPPER, "RESEARCH").replace(EN_TITLE, "Research").replace(EN_LOWER, "research")


def replace_text(text: str) -> str:
    text = text.replace(EN_UPPER, "RESEARCH").replace(EN_TITLE, "Research").replace(EN_LOWER, "research")
    for old, new in RU_REPLACEMENTS:
        text = text.replace(old, new)
    return text


def rename_paths() -> None:
    for old in sorted(tracked(), key=lambda p: (p.count("/"), len(p)), reverse=True):
        new = renamed(old)
        if new == old:
            continue
        target = ROOT / new
        target.parent.mkdir(parents=True, exist_ok=True)
        if target.exists():
            raise RuntimeError(f"rename collision: {old} -> {new}")
        subprocess.run(["git", "mv", old, new], cwd=ROOT, check=True)


def rewrite_tracked_text() -> None:
    for rel in tracked():
        path = ROOT / rel
        try:
            original = path.read_text(encoding="utf-8")
        except (UnicodeDecodeError, IsADirectoryError):
            continue
        updated = replace_text(original)
        if updated != original:
            path.write_text(updated, encoding="utf-8")


def compact_retired_verbatim_block() -> None:
    path = ROOT / "project_docs" / "RESEARCH_RETIRED_DELTA_EVIDENCE.md"
    if not path.exists():
        return
    text = path.read_text(encoding="utf-8")
    pattern = re.compile(
        r"<!-- BEGIN VERBATIM RESEARCH_DELTA_SELECTION_CAPTURE_FIDELITY_2026-08-29\.md -->.*?<!-- END VERBATIM RESEARCH_DELTA_SELECTION_CAPTURE_FIDELITY_2026-08-29\.md -->",
        re.S,
    )
    replacement = (
        "Historical source bytes are preserved by Git object identity `438bf6a4b2e3318d0efcfb97ef778da30f2f0faa`. "
        "The current research tree intentionally does not reproduce retired historical wording; provenance is verified by hash-addressed Git object existence."
    )
    text = pattern.sub(replacement, text)
    text = text.replace("verbatim preservation", "hash-addressed provenance preservation")
    text = text.replace("verbatim retirement", "hash-addressed provenance retirement")
    path.write_text(text, encoding="utf-8")


def append_provenance_notes() -> None:
    names = (
        "RESEARCH_REPLACED_RESOURCE_CONVERGENCE_FINAL_2026-08-30_EVIDENCE.md",
        "RESEARCH_CSS_VISUAL_DEPENDENCY_GRAPH_FINAL_2026-08-30_EVIDENCE.md",
        "RESEARCH_FLATTENED_DOCUMENT_NAMESPACE_FINAL_2026-08-30_EVIDENCE.md",
        "RESEARCH_COMPOSED_RENDERED_SCOPE_CONVERGENCE_FINAL_2026-08-30_EVIDENCE.md",
    )
    note = "\n\n## Terminology migration provenance note\n\nCurrent filenames in this document use the canonical Research terminology. Historical source identity is anchored by the recorded source commit and blob SHA values; immutable historical pathname spellings are intentionally not reproduced in the current mutable tree.\n"
    for name in names:
        path = ROOT / "project_docs" / name
        if path.exists():
            text = path.read_text(encoding="utf-8")
            if "Terminology migration provenance note" not in text:
                path.write_text(text.rstrip() + note, encoding="utf-8")


def install_policy_and_contract() -> None:
    docs = ROOT / "project_docs"
    (docs / "COMPREHENSIVE_PROJECT_RESEARCH_POLICY.md").write_text(POLICY, encoding="utf-8")
    tools = ROOT / "project_tools"
    (tools / "check_research_terminology.py").write_text(CHECKER, encoding="utf-8")
    (tools / "test_research_terminology.py").write_text(SELF_TEST, encoding="utf-8")
    (tools / "test_final_delta_retirement.py").write_text(FINAL_DELTA_TEST, encoding="utf-8")
    (tools / "test_staged_evidence_compaction.py").write_text(STAGED_TEST, encoding="utf-8")

    manifest_path = docs / "CONTEXT_MANIFEST.json"
    manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
    manifest.setdefault("authorities", {})["research_scope_policy"] = "project_docs/COMPREHENSIVE_PROJECT_RESEARCH_POLICY.md"
    bootstrap = manifest.setdefault("bootstrap", [])
    policy_rel = "project_docs/COMPREHENSIVE_PROJECT_RESEARCH_POLICY.md"
    if policy_rel not in bootstrap:
        bootstrap.insert(1 if bootstrap else 0, policy_rel)
    research_profile = manifest.setdefault("profiles", {}).setdefault("research", [])
    if policy_rel not in research_profile:
        research_profile.insert(0, policy_rel)
    manifest_path.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    readme = ROOT / "README.md"
    text = readme.read_text(encoding="utf-8")
    block = "\n## Comprehensive Project Research\n\nProject-wide engineering research is governed by `project_docs/COMPREHENSIVE_PROJECT_RESEARCH_POLICY.md`. It covers requirements, architecture, implementation conformity, standards, technical debt, performance, reliability, defensive security, maintainability, dependencies, risks, improvement alternatives, architecture recommendations, comparable products, user expectations, usage trends and user stories.\n"
    if "## Comprehensive Project Research" not in text:
        readme.write_text(text.rstrip() + "\n" + block, encoding="utf-8")

    state = ROOT / "GITHUB_REPOSITORY_STATE.md"
    text = state.read_text(encoding="utf-8")
    block = "\n## Comprehensive Project Research terminology and scope\n\nThe permanent project-wide engineering activity is **Comprehensive Project Research, Assessment and Architecture Development**, canonically defined by `project_docs/COMPREHENSIVE_PROJECT_RESEARCH_POLICY.md`. Current mutable repository material and current GitHub work use Research terminology. Immutable historical Git objects remain unchanged and are referenced by stable hashes/run identifiers for provenance.\n"
    if "## Comprehensive Project Research terminology and scope" not in text:
        state.write_text(text.rstrip() + "\n" + block, encoding="utf-8")

    workflow = ROOT / ".github" / "workflows" / "repository-integrity.yml"
    text = workflow.read_text(encoding="utf-8")
    if "Research terminology contract" not in text:
        anchor = "      - name: Context/bootstrap contract\n"
        steps = (
            "      - name: Research terminology contract\n"
            "        run: python project_tools/check_research_terminology.py\n\n"
            "      - name: Research terminology checker self-test\n"
            "        run: python project_tools/test_research_terminology.py\n\n"
        )
        if anchor not in text:
            raise RuntimeError("repository integrity insertion anchor missing")
        text = text.replace(anchor, steps + anchor, 1)
        workflow.write_text(text, encoding="utf-8")


def remove_one_shot_files() -> None:
    for rel in (SELF, TEMP_WORKFLOW):
        path = ROOT / rel
        if path.exists():
            path.unlink()


def main() -> int:
    rename_paths()
    rewrite_tracked_text()
    compact_retired_verbatim_block()
    append_provenance_notes()
    install_policy_and_contract()
    remove_one_shot_files()
    subprocess.run(["git", "add", "-A"], cwd=ROOT, check=True)
    subprocess.run(["python", "project_tools/check_research_terminology.py"], cwd=ROOT, check=True)
    subprocess.run(["python", "project_tools/test_research_terminology.py"], cwd=ROOT, check=True)
    print("Comprehensive research terminology and scope migration prepared successfully.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
