# Comprehensive Project Research, Assessment and Architecture Development Policy

Status: **CANONICAL / PERMANENT**

## Canonical concept

The canonical Russian name of the project-wide engineering activity is:

**«Комплексное исследование, оценка и проработка проекта и его архитектуры»**.

Allowed concise forms are:

- «Комплексное исследование проекта»;
- «Глубокое комплексное исследование проекта»;
- «Полное комплексное исследование проекта».

In repository paths, machine-readable fields, CI identifiers and English operational prose, the word **Research** denotes this full canonical concept unless a narrower meaning is explicitly stated.

## Current-baseline rule

Every research tranche starts from:

1. fresh current GitHub `main` exact SHA;
2. current requirements/technical conditions in `USER_REQUIREMENTS.md`;
3. current rationale in `DECISIONS_AND_RATIONALE.md`;
4. current architecture/contracts relevant to the question;
5. current P-owner/status authority in `RESEARCH_REGISTRY.md`.

Historical requirements, dated handoffs, old chats, old release notes and superseded approaches are not used to reconstruct current requirements during ordinary research. Git history and historical evidence are read only when needed for provenance, regression investigation, duplicate/root-cause reconciliation or an explicitly historical question.

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

## Mandatory multi-source external research

For **every substantive research question**, external research is a mandatory part of the analysis, not an optional enrichment step.

The researcher MUST actively seek multiple relevant sources across the categories that fit the question, including where available:

- official sites, documentation and technical materials of analogous or adjacent products/vendors;
- similar or partially related public implementations on GitHub and GitLab;
- issues, discussions, bug reports, design notes and postmortems from those projects;
- relevant standards, specifications and browser/platform documentation;
- discussion forums, Reddit and other user/community sources describing real usage, complaints, expectations and workarounds;
- independent technical analyses/comparisons when they add a materially different perspective.

A single convenient source is not sufficient when independent sources are reasonably available. Source diversity should be proportional to the importance, uncertainty and architectural impact of the question.

External observations are **hypotheses, known failure modes, comparison points and candidate solution approaches**. They do not automatically become WebClip requirements and do not establish correctness merely because another product/vendor/project uses them.

Every material recommendation MUST weigh:

- applicability to the WebClip product mission and current requirements;
- evidence from fresh current source/architecture inspection;
- browser/platform constraints;
- fidelity and user impact;
- defensive security and privacy;
- reliability and failure semantics;
- performance/scalability;
- implementation complexity and technical debt;
- maintainability and future architecture;
- compatibility/migration cost;
- disagreement or trade-offs across external sources.

The final conclusion MUST be checked against fresh WebClip `main`. If adequate external material cannot be found, the research must record the search boundary/uncertainty rather than treating one weak source or an unsupported assumption as consensus.

## Evidence and reasoning model

Research conclusions MUST distinguish:

- canonical project requirements and contracts;
- current source and architecture inspection;
- deterministic test evidence;
- physical/browser/external evidence;
- external industry/vendor/community research;
- inference and architecture recommendations.

Historical results may accelerate discovery and duplicate reconciliation, but current campaign advancement requires fresh evidence appropriate to the claim. Existing P-code ownership remains the root-cause/status authority unless canonical project policy explicitly changes it.

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

## Session-window requirement

Before a substantive research tranche, estimate whether the planned scope, external research, required physical evidence and delivery tail can be completed accurately within the available instrumental session window.

If not, divide the work into multiple interruption-safe sessions/tranches with exact durable GitHub resume points. The number of sessions is not a success metric. Completeness, accuracy, depth of analysis, correct duplicate/root-cause reconciliation and truthful evidence take priority over minimizing the number of instrumental windows.

A research scope or evidence level MUST NOT be weakened merely to finish within one session.

## Local-first execution requirement

Research and verification operations that can be truthfully performed with available local/built-in tools SHOULD be performed there before consuming GitHub Actions runner time.

GitHub Actions are reserved for:

- required environment/physical/external evidence that cannot be honestly obtained locally; and
- explicitly mandatory independent repository/delivery/release gates defined by project workflow.

GitHub Actions must not become the default interactive debugger or replace an available local deterministic/static check merely for convenience. Runner minimization must never weaken required evidence, exact-SHA verification, TOCTOU, post-merge integrity or physical/external validation.

## Repository terminology contract

Current mutable repository documents, templates, project tools, workflow definitions, active branch names and current GitHub work items MUST use the Research terminology defined here. Immutable historical Git objects and externally stored execution history remain unchanged for provenance.

Repository Integrity enforces this terminology contract on the current tracked tree.
